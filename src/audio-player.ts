import {LitElement, html, css} from 'lit';
import {guard} from 'lit/directives/guard.js';
import {customElement, property, query, state} from 'lit/decorators.js';

type RemoteData =
  | {kind: 'NotAsked'}
  | {kind: 'Loading'}
  | {kind: 'Failure'; error: string}
  | {kind: 'Success'; result: AudioBuffer};

/**
 * audio-player element.
 *
 * @fires play-changed - Indicates when the count changes
 * @slot {HTMLAudioElement} - add an `audio` element with the controlls attribute set pointing to the source you want to play. If the web-component fails to render you'll still be left with the browsers native audio player
 * @csspart button - The button
 */
@customElement('audio-player')
export class AudioPlayer extends LitElement {
  static override styles = css`
    :host {
      box-sizing: border-box;
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }

    :host canvas {
      width: 100%;
    }

    :host #position {
      width: 100%;
    }

    :host .track {
      width: 100%;
      display: flex;
      height: 100px;
      gap: 1px;
      align-items: center;
    }

    :host .track div {
      flex-grow: 100;
      background-color: fuchsia;
      content: '';
    }
  `;

  private _audio: HTMLAudioElement | null = null;
  private _audioCtx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _gain: GainNode | null = null;

  @query('canvas')
  private _canvas: HTMLCanvasElement | null;

  @query('#position')
  private _posControl: HTMLInputElement | null;

  @state()
  private _pos: number = 0;

  @state()
  private _paused: boolean = true;

  @state()
  private _wave: Uint8Array = new Uint8Array();

  @state()
  private _audioBuffer: RemoteData = {kind: 'NotAsked'};

  override connectedCallback(): void {
    super.connectedCallback();
    // this feels out of sync with how Lit wants to work
    // but it needs to happen before render or we don't know if we have an audio element to render controls for
    this._audio = this.querySelector('audio');
    if (this._audio) {
      this._setupAudio();
      if (this._audio.src) {
        this._audioBuffer = {kind: 'Loading'};
        fetch(this._audio.src)
          .then((res) => {
            if (res.ok) {
              return res.arrayBuffer();
            } else {
              throw new Error("Can't load audio.");
            }
          })
          .then((buf) => {
            if (this._audioCtx) {
              this._audioCtx
                .decodeAudioData(buf)
                .then((audBuf) => {
                  this._audioBuffer = {kind: 'Success', result: audBuf};
                })
                .catch((e) => {
                  this._audioBuffer = {kind: 'Failure', error: e.message};
                });
            }
          })
          .catch((e) => {
            console.log('borked');
            this._audioBuffer = {kind: 'Failure', error: e.message};
          });
      }
    }
  }

  override firstUpdated() {
    // runs once after render
    console.log('FIRST UPDATED');
    const canvasCtx = this._canvas.getContext('2d');
    if (canvasCtx) {
      const height = this._canvas.height;
      const width = this._canvas.width;
      const bufferLength = this._analyser.frequencyBinCount;

      canvasCtx.clearRect(0, 0, width, height);
      this._draw(canvasCtx, width, height, bufferLength);
    }
  }

  override render() {
    const missingAudioMsg = html`<div>
      <p>oops - we can't find the track you were looking for</p>
    </div>`;

    const audioControls = html`<h1><code>audio-player</code></h1>
      <button @click="${this._onClick}" part="button">
        ${this._paused ? html`play` : html`pause`}
      </button>
      <label for="volume">Volume</label>
      <input
        @input="${this._onVolChange}"
        type="range"
        id="volume"
        name="volume"
        min="-1"
        max="1"
        value="1"
        step="0.01"
      />
      <label for="position">Position</label>
      <input
        @input="${this._onPosChange}"
        type="range"
        id="position"
        name="position"
        min="0"
        max="${this._audio?.duration}"
        value="${this._pos}"
        step="1"
      />
      <p>Playback position: <span>${this._pos}</span></p>

      <canvas width="900" height="300"></canvas>`;

    const remoteDataSwitch = (rd: RemoteData) => {
      switch (rd.kind) {
        case 'Loading':
          return html`<p>LOADING STATE</p>`;
        case 'NotAsked':
          return html`<p>NOT_ASKED STATE</p>`;
        case 'Success':
          // blocks re-render of template function until this._audioBuffer has changed
          return guard([this._audioBuffer], () => this._drawTrack(rd.result));
        case 'Failure':
          return html`<p>FAILURE STATE</p>`;
      }
    };

    return html`
      ${remoteDataSwitch(this._audioBuffer)}
      ${this._audio ? audioControls : missingAudioMsg}
      <slot></slot>
    `;
  }

  private _drawTrack(ab: AudioBuffer) {
    const cData = ab.getChannelData(0);
    const nBars = 200;
    const chunkSize = Math.floor(cData.length / nBars);
    const heights = cData
      .reduce(
        (acc, cv) => {
          const currentChunk = acc[acc.length - 1];
          const val = Math.abs(cv);
          if (currentChunk.length < chunkSize) {
            currentChunk.push(val);
            return acc;
          } else {
            acc.push([val]);
            return acc;
          }
        },
        [[0]]
      )
      .map((xs) => xs.reduce((a, b) => a + b) / xs.length);
    const quantizer = (
      minIn: number,
      maxIn: number,
      minOut: number,
      maxOut: number
    ) => {
      const inDiff = maxIn - minIn;
      const outDiff = maxOut - minOut;
      const unit = outDiff / inDiff;
      return (valFrom: number): number => {
        return minOut + unit * valFrom;
      };
    };
    const maxHeight = 100;
    const quantize = quantizer(
      Math.min(...heights),
      Math.max(...heights),
      0,
      maxHeight
    );
    return html`<p>SUCCESS STATE</p>
      <p>I probably want to quantize these values somehow</p>
      <p>
        <code>(min: ${Math.min(...heights)}</code>,
        <code> max: ${Math.max(...heights)})</code>
      </p>
      <div class="track">
        ${heights.map(
          (x) => html`
            <div style="height:${Math.round(quantize(x))}px;"></div>
          `
        )}
      </div>`;
  }

  private _setupAudio() {
    this._audio.controls = false;
    this._audioCtx = new window.AudioContext();
    this._analyser = this._audioCtx.createAnalyser();
    const gainNode = this._audioCtx.createGain();
    this._gain = gainNode;
    this._analyser.minDecibels = -90;
    this._analyser.maxDecibels = -10;
    this._analyser.smoothingTimeConstant = 0.85;

    let source = this._audioCtx.createMediaElementSource(this._audio);
    source.connect(this._analyser);
    source.connect(this._gain);
    source.connect(this._audioCtx.destination);
    this._gain.connect(this._audioCtx.destination);

    this._analyser.fftSize = 256;
    this._wave = new Uint8Array(this._analyser.frequencyBinCount);
  }

  // might be better to generate a single wave form rather than a live one?
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer/getChannelData
  // https://github.com/katspaugh/wavesurfer.js/blob/main/src/renderer.ts
  //
  // It looks like I might have to manually create an AudioBuffer via a fetch
  // request (audioEl.src) then turn that into the source for an audioNode ??
  // seems a bit round about I'd hoped there'd be a way to get it from the existing
  // audioNode associated with the HTMLAudioElement
  private _draw(
    canvasCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    bufferLength: number
  ) {
    this._analyser.getByteTimeDomainData(this._wave);
    requestAnimationFrame(() => {
      this._draw(canvasCtx, width, height, bufferLength);
    });
    this._pos = this._audio.currentTime;
    if (this._posControl) {
      this._posControl.value = `${this._pos}`;
    }
    canvasCtx.fillStyle = 'rgb(200 200 200)';
    canvasCtx.fillRect(0, 0, width, height);
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = 'rgb(0 0 0)';
    canvasCtx.beginPath();
    const sliceWidth = width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = this._wave[i] / 128.0;
      const y = v * (height / 2);

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
  }

  private _onClick() {
    if (this._audio) {
      if (this._pos === 0) {
        this._audioCtx?.resume(); // chrome requires this human interaction but you only need it once
      }
      if (this._audio.paused) {
        this._audio.play();
      } else {
        this._audio.pause();
      }
      this._paused = !this._paused;
      this.dispatchEvent(new CustomEvent('play-changed'));
    }
  }

  private _onVolChange(e) {
    if (this._gain) {
      this._gain.gain.value = e.target.value;
    }
  }

  private _onPosChange(e) {
    if (this._audio) {
      // 2 - in chrome and firefox the thumb position of the range input stops tracking the value aftr input
      this._audio.currentTime = `${e.target.value}`; // must be string for chrome
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-player': AudioPlayer;
  }
}
