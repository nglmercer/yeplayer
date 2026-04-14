import { serve } from "bun";
import ui from "./examples/ui.html";
import hls from "./examples/hls.html";
import preact from "./examples/preact/index.html";
import vanilla from "./examples/vanilla-js/index.html";

/**
 * leverages Bun's integrated bundler and HMR.
 */
const server = serve({
    port: process.env.PORT || 3001,

    // Enable development mode: HMR, source maps, and console mirroring
    development: {
        hmr: true,
        console: true,
    },

    routes: {
        // Map HTML files to routes. Bun automatically bundles their
        // <script> and <link> tags, transpiling TS/JSX/TSX on the fly.
        "/": ui,
        "/hls": hls,
        "/preact": preact,
        "/vanilla": vanilla,

        // API Example (from docs pattern)
        "/api/health": () => Response.json({ status: "ok", time: new Date() }),
    },

    // Fallback fetch for static assets not covered by route bundling
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // Build the file path (relative to the project root)
        const filePath = "." + pathname;
        const file = Bun.file(filePath);

        if (await file.exists()) {
            return new Response(file, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache",
                },
            });
        }

        return new Response("404: Not Found", { status: 404 });
    },
});

console.clear();
console.log(`
  -----------------------------
  \x1b[32mMain UI:\x1b[0m   ${server.url}
  \x1b[32mPreact:\x1b[0m    ${server.url}preact
  \x1b[32mHLS Demo:\x1b[0m  ${server.url}hls
  \x1b[32mVanilla:\x1b[0m  ${server.url}vanilla
  
  \x1b[90mEnvironment:\x1b[0m development (HMR Enabled)
`);