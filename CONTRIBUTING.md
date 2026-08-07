# Contributing to SiteGlow AI

SiteGlow AI is a Chrome MV3 side panel extension built with React, TypeScript and Vite.

## Local setup

```bash
npm ci
npm test
npm run build
```

Then open `chrome://extensions`, enable Developer mode, choose
Load unpacked, and select the dist/ folder.

## Before opening a pull request

```bash
npm test
npm run build
```

Make sure the build succeeds and the extension still loads.

## Guidelines

- Keep the change focused. One concern per pull request.
- Match the surrounding code: same naming, same file layout, same idiom.
- Do not commit `node_modules`, build output that is not already tracked, or
  anything containing a key or token.
- If you change what the extension does, update the README and the CHANGELOG in
  the same pull request.
- If you add a permission to the manifest, say in the pull request why it is
  needed. Every permission has to be justified to the Chrome Web Store, and an
  unexplained one blocks a release.

## Reporting bugs

Open an issue using the bug report template. A reproduction beats a
description: the page you were on, what you clicked, what happened, and what
you expected instead.

## Security

Please do not open a public issue for a security problem. See
[SECURITY.md](./SECURITY.md) if present, or contact the maintainer directly.
