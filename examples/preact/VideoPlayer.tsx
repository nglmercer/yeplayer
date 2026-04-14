//import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Player, createControls, createGestures, createHlsPlugin } from 'ssassplayer';
import '../../dist/player.css';

interface SubtitleTrack {
  id: string;
  label: string;
  lang: string;
  url: string;
}

interface PlayerProps {
  src: string;
  poster?: string;
  autoplay?: boolean;
  subtitles?: SubtitleTrack[];
  onEnded?: () => void;
}

export const VideoPlayer = ({ src, poster, autoplay, subtitles, onEnded }: PlayerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const player = new Player({
      media: videoRef.current,
      container: containerRef.current,
      autoplay: !!autoplay
    });

    const setupPlugins = async () => {
      await player.usePlugin(createHlsPlugin());
      
      if (src) {
        player.setSource(src);
      }

      await player.usePlugin(createControls());
      await player.usePlugin(createGestures());

      if (autoplay) {
        player.play().catch(e => console.warn("Autoplay blocked:", e));
      }
    }

    setupPlugins();

    const handleEnded = () => onEnded?.();
    videoRef.current.addEventListener('ended', handleEnded);

    playerRef.current = player;

    return () => {
      videoRef.current?.removeEventListener('ended', handleEnded);
      player.destroy();
    };
  }, [src, autoplay]); // Depend on src to re-init if key is not used, though App.tsx uses key

  return (
    <div
      ref={containerRef}
      className="player-wrapper"
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        crossorigin="anonymous"
      />
    </div>
  );
};

