import {LitElement, html, css} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';

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
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }

    :host canvas {
      width: 100%;
    }
  `;

  private _audio: HTMLAudioElement | null = null;

  private _analyser: AnalyserNode | null = null;

  @query('canvas')
  private _canvas: HTMLCanvasElement | null;

  @state()
  private _paused: boolean = true;

  @state()
  private _wave: Uint8Array = new Uint8Array();

  override connectedCallback(): void {
    super.connectedCallback();
    // this feels out of sync with how Lit wants to work
    // but it needs to happen before render or we don't know if we have an audio element to render controls for
    this._audio = this.querySelector('audio');
    if (this._audio) {
      this._audio.controls = false;
      let audioCtx = new window.AudioContext();
      this._analyser = audioCtx.createAnalyser();
      this._analyser.minDecibels = -90;
      this._analyser.maxDecibels = -10;
      this._analyser.smoothingTimeConstant = 0.85;

      let source = audioCtx.createMediaElementSource(this._audio);
      source.connect(this._analyser);
      source.connect(audioCtx.destination);

      this._analyser.fftSize = 256;
      let bufferLength = this._analyser.frequencyBinCount;
      this._wave = new Uint8Array(bufferLength);
    }
  }

  override firstUpdated() {
    // runs once after render
    console.log('FIRST UPDATED');
    const canvasCtx = this._canvas.getContext('2d');
    if (canvasCtx) {
      const draw = () => {
        this._analyser.getByteTimeDomainData(this._wave);
        requestAnimationFrame(draw);
        const height = this._canvas.height;
        const width = this._canvas.width;
        const bufferLength = this._analyser.frequencyBinCount;
        canvasCtx.fillStyle = 'rgb(200 200 200)';
        canvasCtx.fillRect(0, 0, width, height);
        canvasCtx.lineWidth = 2;
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
      };

      canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
      draw();
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
      <canvas width="300" height="100"></canvas>`;

    return html`
      ${this._audio ? audioControls : missingAudioMsg}
      <slot></slot>
    `;
  }

  private _onClick() {
    if (this._audio) {
      if (this._audio.paused) {
        this._audio.play();
      } else {
        this._audio.pause();
      }
      this._paused = !this._paused;
      this.dispatchEvent(new CustomEvent('play-changed'));
      this.requestUpdate();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-player': AudioPlayer;
  }
}
