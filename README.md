# Blueprint to Real

Static MVP for **ArchVision AI: De Plano a Realidad**.

## Local Development

```bash
npm run dev
```

Open `http://127.0.0.1:4173`.

## Production Build

```bash
npm run build
```

The deployable output is generated in `dist/`.

## Vercel

Vercel uses `vercel.json`:

- Build command: `npm run build`
- Output directory: `dist`
- Static rewrites route all paths to `index.html`
- Security and cache headers are configured for static assets
