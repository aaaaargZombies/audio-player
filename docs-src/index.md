---
layout: page.11ty.cjs
title: <audio-player> ⌲ Home
---

# &lt;audio-player>

`<audio-player>` is an awesome element. It's a great introduction to building web components with LitElement, with nice documentation site as well.

## As easy as HTML

<section class="columns">
  <div>

`<audio-player>` is just an HTML element. You can it anywhere you can use HTML!

```html
<audio-player></audio-player>
```

  </div>
  <div>

<audio-player></audio-player>

  </div>
</section>

## Configure with attributes

<section class="columns">
  <div>

`<audio-player>` can be configured with attributed in plain HTML.

```html
<audio-player name="HTML"></audio-player>
```

  </div>
  <div>

<audio-player name="HTML"></audio-player>

  </div>
</section>

## Declarative rendering

<section class="columns">
  <div>

`<audio-player>` can be used with declarative rendering libraries like Angular, React, Vue, and lit-html

```js
import {html, render} from 'lit-html';

const name = 'lit-html';

render(
  html`
    <h2>This is a &lt;audio-player&gt;</h2>
    <audio-player .name=${name}></audio-player>
  `,
  document.body
);
```

  </div>
  <div>

<h2>This is a &lt;audio-player&gt;</h2>
<audio-player name="lit-html"></audio-player>

  </div>
</section>
