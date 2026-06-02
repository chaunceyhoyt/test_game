# test_game

A web-based mobile game built with vanilla HTML5 Canvas + JavaScript.

## Dev

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser (works on mobile too if your phone is on the same network).

## Build

```bash
npm run build   # outputs to dist/
```

## Deploy

Pushing to `main` auto-deploys to GitHub Pages via the included workflow.  
Enable GitHub Pages in **Settings → Pages → Source: GitHub Actions** first.

## Structure

```
src/main.js     ← game loop, input, drawing
assets/         ← sprites, sounds, etc.
index.html      ← mobile-optimized shell
```
