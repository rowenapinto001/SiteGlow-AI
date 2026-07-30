# SiteGlow AI

SiteGlow AI is a Chrome Manifest V3 side panel extension that captures a stitched full-page website screenshot, sends it to Cloudflare Workers AI, and displays an AI redesign concept with a draggable before/after slider.

The extension never hardcodes API tokens. Each user enters their own Cloudflare Workers AI credentials in the AI Configuration screen. Saved tokens are masked in the interface and are only sent to the official Cloudflare API.

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

1. Open the AI tab.
2. Enter the Cloudflare Workers AI credentials.
4. Choose session-only or persistent local storage.
5. Confirm the image model, then Validate & Save.
6. Return to Capture, enter a public HTTP/HTTPS website URL, and optionally add redesign instructions.
7. Capture and generate the redesign concept.
8. Compare with the slider, regenerate, download, reset, or update configuration.

## Cloudflare Workers AI Free Setup

Cloudflare Workers AI provides a daily free allocation on the Workers Free plan. To use it in SiteGlow:

1. Create or sign in to a Cloudflare account.
2. Open the Cloudflare dashboard.
3. Go to **Workers AI**.
4. Choose **Use REST API**.
5. Copy your **Account ID**.
6. Create a Workers AI API token.
7. Paste the Account ID and token into **SiteGlow AI → AI**.
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
