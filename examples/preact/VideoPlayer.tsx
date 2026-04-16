//import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Player, createControls, createGestures, createHlsPlugin, Menu } from '../../src';
import type { MenuGroup } from '../../src';
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
        const hls = await player.usePlugin(createHlsPlugin());
        const controls = await player.usePlugin(createControls());
        await player.usePlugin(createGestures());

        // Build menu with quality and subtitle options
        const updateMenu = () => {
          const groups: MenuGroup[] = [];

          // Quality options
          const qualityProvider = player.getAPI().getQualityProvider();
          if (qualityProvider) {
            const qualities = qualityProvider.getAvailableQualities();
            const currentQuality = qualityProvider.getCurrentQuality();
            if (qualities.length > 0) {
              groups.push({
                label: "Quality",
                items: [
                  {
                    type: "select",
                    id: "quality",
                    label: "Select Quality",
                    value: String(currentQuality?.id ?? -1),
                    options: [
                      { value: "-1", label: "Auto" },
                      ...qualities.map((q) => ({ value: String(q.id), label: q.label }))
                    ],
                    onChange: (val: string) => qualityProvider.setQuality(parseInt(val))
                  }
                ]
              });
            }
          }

          // Subtitle options
          const textTracks = videoRef.current?.textTracks;
          if (textTracks && textTracks.length > 0) {
            const trackOptions: { value: string, label: string }[] = [];
            for (let i = 0; i < textTracks.length; i++) {
              const track = textTracks[i];
              trackOptions.push({ value: String(i), label: track.label || `Track ${i}` });
            }
            groups.push({
              label: "Subtitles",
              items: [
                {
                  type: "select",
                  id: "subtitles",
                  label: "Select Subtitle",
                  value: String(Array.from(textTracks).findIndex(t => t.mode === 'showing')),
                  options: [
                    { value: "-1", label: "Off" },
                    ...trackOptions
                  ],
                  onChange: (val: string) => {
                    for (let i = 0; i < textTracks.length; i++) {
                      textTracks[i].mode = i === parseInt(val) ? 'showing' : 'hidden';
                    }
                  }
                }
              ]
            });
          }

          // Playback options
          groups.push({
            label: "Playback",
            items: [
              {
                type: "toggle",
                id: "loop",
                label: "Loop Video",
                value: false,
                onChange: (val: boolean) => { if (videoRef.current) videoRef.current.loop = val; }
              },
              {
                type: "select",
                id: "speed",
                label: "Playback Speed",
                value: "1",
                options: [
                  { value: "0.5", label: "0.5x" },
                  { value: "1", label: "Normal" },
                  { value: "1.5", label: "1.5x" },
                  { value: "2", label: "2x" }
                ],
                onChange: (val: string) => player.setRate(parseFloat(val))
              }
            ]
          });

          return groups;
        };

        const menu = new Menu(containerRef.current!, updateMenu());

        // Connect settings button to menu
        controls.getSettingsButton().onclick = (e: Event) => {
          e.stopPropagation();
          menu.setGroups(updateMenu());
          menu.toggle();
        };

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

