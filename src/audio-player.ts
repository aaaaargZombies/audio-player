import {LitElement, html, css} from 'lit';
import {customElement, state} from 'lit/decorators.js';

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
  `;

  private _audio: HTMLAudioElement | null = null;

  @state()
  private _paused: boolean = true;

  override connectedCallback(): void {
    super.connectedCallback();
    this._audio = this.querySelector('audio');
    console.log(this._audio);
  }

  override render() {
    const missingAudioMsg = html`<div>
      <p>oops - we can't find the track you were looking for</p>
    </div>`;

    const audioControls = html`<h1><code>audio-player</code></h1>
      <button @click="${this._onClick}" part="button">
        ${this._paused ? html`play` : html`pause`}
      </button>`;

    return html`
      ${this._audio ? audioControls : missingAudioMsg}
      <slot></slot>
    `;
  }

  private _onClick() {
    console.log('hellow');
    console.log(this._audio);
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
