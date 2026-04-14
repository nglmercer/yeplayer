<template>
  <div 
    ref="container" 
    class="player-wrapper"
    :style="{ width: '100%', aspectRatio: '16/9', background: '#000' }"
  >
    <video 
      ref="video" 
      :poster="poster" 
      crossorigin="anonymous" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { Player, createControls, createGestures, createHlsPlugin } from 'agnostic-player';
import 'agnostic-player/styles/player.css';

const props = defineProps({
  src: { type: String, required: true },
  poster: { type: String, default: '' },
  autoplay: { type: Boolean, default: false }
});

const container = ref(null);
const video = ref(null);
let player = null;

onMounted(async () => {
  if (!video.value || !container.value) return;

  // Initialize Player
  player = new Player({
    media: video.value,
    container: container.value,
    autoplay: props.autoplay
  });

  // Add Plugins
  await player.usePlugin(createControls());
  await player.usePlugin(createGestures());
  await player.usePlugin(createHlsPlugin());

  // Set Source
  player.setSource(props.src);
});

onBeforeUnmount(() => {
  if (player) {
    player.destroy();
  }
});

// Watch for source changes
watch(() => props.src, (newSrc) => {
  if (player) {
    player.setSource(newSrc);
  }
});
</script>

<style scoped>
/* Any component-specific styles */
</style>
