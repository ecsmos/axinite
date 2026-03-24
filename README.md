# Axinite Monorepo

Monorepo on `bun` + `turborepo` with a `vite` frontend and formatting/linting via `biome`.

## What's inside

- `apps/demo`: a demo app on `three.js` with a rotating cube via `WebGPURenderer`.
- `packages/utils`: a starting point for shared packages (example library).

## Requirements

- `bun` version around `1.1+` (the repo specifies `packageManager: bun@1.1.0`)
- A browser with `WebGPU` support (the demo won't run without WebGPU; for local development, `localhost` is usually enough).
- `secure context` is required for WebGPU (typically `https` or `localhost`).

## Quick start

1. Install dependencies:
```bash
bun install
```

2. Start the demo:
```bash
bun dev
```

Open `http://localhost:3000/`.

> The monorepo currently contains only one app (`apps/demo`), so `bun dev` effectively starts it.

## Build

```bash
bun build
```

## Biome (linting and formatting)

Terminal commands:

```bash
bun lint
bun format
```

If you're using Cursor/VS Code, to enable “format on save”:

1. Install the Biome extension: `biomejs.biome`
2. Add the following to `settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "biome.enabled": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit",
  }
}
```

## Further expansion

Adding new applications under `apps/*` and packages under `packages/*` is expected. Later, you can wire these packages into `turbo.json` (e.g. `build`/`lint`).
