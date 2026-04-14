import { h } from 'preact';
import { useState } from 'preact/hooks';
import { VideoPlayer } from './VideoPlayer';
import './styles.css';

export function App() {
    const [videoUrl, setVideoUrl] = useState('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
    const [inputValue, setInputValue] = useState(videoUrl);

    const handleLoad = () => {
        setVideoUrl(inputValue);
    };

    return (
        <div class="container">
            <header class="header">
                <h1>YePlayer</h1>
                <p>Premium HLS Media Experience</p>
            </header>

            <div class="url-input-container">
                <input 
                    type="text" 
                    class="url-input" 
                    placeholder="Enter HLS .m3u8 URL..." 
                    value={inputValue}
                    onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                />
                <button class="load-btn" onClick={handleLoad}>
                    <span>Load Video</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
            </div>

            <main class="player-card">
                <VideoPlayer key={videoUrl} src={videoUrl} autoplay={true} />
            </main>
        </div>
    );
}
