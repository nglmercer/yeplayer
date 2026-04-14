/** @jsx h */
import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Player, createControls, createGestures, createHlsPlugin } from 'ssassplayer';
import '../../dist/player.css';

interface PlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
}

export const VideoPlayer = ({ src, poster, autoplay }: PlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    // Initialize Player
    const player = new Player({
      media: videoRef.current,
      container: containerRef.current,
      autoplay: autoplay || false
    });

    // Add Plugins
    const setupPlugins = async () => {
      await player.usePlugin(createControls());
      await player.usePlugin(createGestures());
      await player.usePlugin(createHlsPlugin());

      // Set Source
      player.setSource(src);
    }

    setupPlugins();

    playerRef.current = player;

    return () => {
      // Cleanup
      player.destroy();
    };
  }, [src, autoplay]);

  return (
    <div
      ref={containerRef}
      className="player-wrapper"
      style={{ width: '100%', aspectRatio: '16/9', background: '#000' }}
    >
      <video
        ref={videoRef}
        poster={poster}
        crossorigin="anonymous"
      />
    </div>
  );
};

// Usage Example:
// <VideoPlayer src="https://example.com/stream.m3u8" />
