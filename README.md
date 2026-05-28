# blueprint-2-real

Static MVP for converting blueprints into AI-assisted interior render concepts.

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
