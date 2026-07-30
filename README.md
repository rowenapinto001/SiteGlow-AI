# SiteGlow AI

[![CI](https://github.com/rowenapinto001/SiteGlow-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/rowenapinto001/SiteGlow-AI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-ff4f41.svg)](public/manifest.json)
[![Tech Stack](https://img.shields.io/badge/Tech-React%20%2B%20TypeScript-3178c6.svg)](#tech-stack)
[![Status](https://img.shields.io/badge/Status-v0.1.0-f06292.svg)](https://github.com/rowenapinto001/SiteGlow-AI/releases/tag/v0.1.0)

SiteGlow AI is a Chrome Manifest V3 side panel extension that captures a stitched full-page website screenshot, sends it to Cloudflare Workers AI, and displays the Before and After redesign concept in separate scrollable previews.

The extension never hardcodes API tokens. Each user enters their own Cloudflare Workers AI credentials in the AI Configuration screen. Saved tokens are masked in the interface and are only sent to the official Cloudflare API.

## Demo

[![SiteGlow AI demo video thumbnail](public/assets/siteglow-ai-thumbnail.png)](public/assets/siteglow-ai-demo.mp4)

[Watch the SiteGlow AI demo video](public/assets/siteglow-ai-demo.mp4)

## What it does

SiteGlow AI lets users enter a public website URL, capture a full-page Before screenshot, generate an AI redesign concept, and review separate scrollable Before and After previews in the Chrome side panel.

## Why I built this

I wanted a faster way to explore website redesign ideas without touching the live site. SiteGlow turns a screenshot into a visual concept workflow that is easy to test, review, and download.

## Features

- Chrome Extension Manifest V3 side panel
- Full-page website capture with stitched screenshots
- Cloudflare Workers AI image generation
- User-provided API token configuration
- Separate scrollable Before and After previews
- Before/After downloads
- Session-only or persistent local credential storage
- Friendly authentication, quota, model, and API errors

## Tech Stack

- React
- TypeScript
- Vite
- Chrome Side Panel API
- `chrome.tabs.captureVisibleTab`
- Offscreen canvas stitching
- Cloudflare Workers AI
- Chrome Storage and Downloads APIs

## Setup

```bash
npm install
npm run build
```

Then load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select the generated `dist` folder.
5. Click the SiteGlow AI toolbar button to open the Chrome side panel.

## Development

```bash
npm run dev
npm test
npm run build
```

For local development, use the built `dist` folder when testing Chrome extension APIs such as `chrome.sidePanel`, `chrome.tabs.captureVisibleTab`, `chrome.scripting`, `chrome.storage`, `chrome.downloads`, and the MV3 offscreen document.

## Usage

1. Open SiteGlow AI. Capture is the default starting point.
2. Use the top-right settings button when credentials need to be added or changed.
3. Enter the Cloudflare Workers AI credentials.
4. Choose session-only or persistent local storage.
5. Confirm the image model, then Validate & Save.
6. Return to Capture, enter a public HTTP/HTTPS website URL, and optionally add redesign instructions.
7. Capture and generate the redesign concept.
8. Review the Before and After previews, download images, or update configuration.

## Cloudflare Workers AI Free Setup

Cloudflare Workers AI provides a daily free allocation on the Workers Free plan. To use it in SiteGlow:

1. Create or sign in to a Cloudflare account.
2. Open the Cloudflare dashboard.
3. Go to **Workers AI**.
4. Choose **Use REST API**.
5. Copy your **Account ID**.
6. Create a Workers AI API token.
7. Paste the Account ID and token into **SiteGlow AI → Settings**.
8. Keep the default model `@cf/runwayml/stable-diffusion-v1-5-img2img`, then click **Validate & Save**.

If you create a custom token manually, give it Workers AI permissions. Keep the token private and do not screenshot or share it.

## Optional Local API Test

The extension does not need a `.env` file in production. For local developer-only API checks, copy `.env.example` to `.env` and fill in your own Cloudflare values:

```bash
cp .env.example .env
```

Never commit `.env`. It is ignored by git.

## Notes

- The generated image is a redesign concept only. SiteGlow AI does not modify the live website.
- Very long pages may be scaled during stitching to keep the uploaded image within a practical canvas/API size.
- Authentication, quota, model, and API errors are surfaced in the interface without logging or revealing the API token.
- CI runs `npm ci`, `npm test`, `npm run build`, and `npm audit` on GitHub Actions.

## License

MIT
