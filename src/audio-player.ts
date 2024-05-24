/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {LitElement, html, css} from 'lit';
import {customElement, property} from 'lit/decorators.js';

/**
 * An example element.
 *
 * @fires play-changed - Indicates when the count changes
 * @slot - This element has a slot
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

  @property()
  _audio = null;

  override connectedCallback(): void {
    this._audio = this.querySelector('audio');
    console.log(this._audio);
  }

  override render() {
    return html`<h1>Hello</h1>
      <button @click="${this._onClick}" part="button"></button>
      <slot></slot>`;
  }

  private _onClick() {
    if (this._audio) {
      this._audio.paused = !this._audio.paused;
      this.dispatchEvent(new CustomEvent('play-changed'));
    }
  }

  /**
   * Formats a greeting
   * @param name The name to say "Hello" to
   */
  sayHello(name: string): string {
    return `Hello, ${name}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'audio-player': AudioPlayer;
  }
}
