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

## Real AI Rendering

The serverless endpoint `api/render.js` calls OpenRouter image generation through the Chat Completions API.

Required Vercel environment variable:

```bash
OPENROUTER_API_KEY=...
```

Optional:

```bash
OPENROUTER_RENDER_MODEL=black-forest-labs/flux.2-klein-4b
```

Default model behavior:

- Uploaded plan image or image URL: `black-forest-labs/flux.2-klein-4b`, selected because it supports text + image input and is one of OpenRouter's most cost-effective image-reference models.
- No plan image reference: `google/imagen-4-fast`, selected for minimum-cost text-to-image generation.

You can override either default with `OPENROUTER_RENDER_MODEL` without changing code.

For real plan-conditioned rendering, upload a JPG, PNG, GIF, or provide a public image URL. Local PDFs are accepted by the UI for the product flow, but PDF-to-image conversion should be added as a separate backend step before sending the plan to the render endpoint.
