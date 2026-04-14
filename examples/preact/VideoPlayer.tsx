//import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Player, createControls, createGestures, createHlsPlugin } from '../../src';
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
      autoplay: false // Handle explicitly after plugins/source
    });

    const setupPlugins = async () => {
      try {
        // 1. Install plugins first (HLS plugin now auto-imports hls.js)
        await player.usePlugin(createHlsPlugin());
        await player.usePlugin(createControls());
        await player.usePlugin(createGestures());

        // 2. Set source — the HLS plugin's sourcechange listener will handle .m3u8
        if (src) {
          player.setSource(src);
        }

        // 3. Handle autoplay — wait for the media to be ready
        // Firefox requires the MediaSource to be fully attached and manifest parsed
        // before play() can be called. Use canplay event which fires after hls.js
        // has attached and parsed the manifest.
        if (autoplay) {
          const attemptPlay = () => {
            player.play().catch(e => {
              console.warn("Autoplay blocked, muting video to allow playback");
              if (videoRef.current) {
                videoRef.current.muted = true;
                player.play().catch(err => console.log("Muted autoplay also blocked:", err));
              }
            });
          };

          // Wait for canplay — this fires after hls.js has attached MediaSource
          // and parsed the manifest on all browsers including Firefox
          if (videoRef.current!.readyState >= 3) {
            attemptPlay();
          } else {
            videoRef.current!.addEventListener('canplay', attemptPlay, { once: true });
          }
        }
      } catch (error) {
        console.error("Error setting up player plugins:", error);
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
        playsinline
      />
    </div>
  );
};

