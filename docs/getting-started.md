# Getting Started

## Installation

Install the package via npm:

```bash
npm install ytplayer
```

## Basic Usage

To create a basic player, you need an HTML video element and a container:

```html
<div class="player-wrapper">
    <video id="video" src="video.mp4"></video>
</div>
```

Then, initialize the player in your JavaScript:

```javascript
import { Player, Controls } from 'ytplayer';
import 'ytplayer/styles/player.css';

const video = document.getElementById('video');

// Initialize Player
const player = new Player({
    media: video,
    autoplay: false
});

// Add Controls
const controls = new Controls(player, document.querySelector('.player-wrapper'));
```

## CSS Setup

Ensure you import the styles or include `styles/player.css` in your project to get the YouTube-like aesthetics.
