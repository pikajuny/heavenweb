# AGENTS.md

This directory is the active Vercel frontend for Compya and the active Git repository.

## Scope

Edit files here for frontend behavior, layout, styling, and Vercel API routes.

Backend business logic belongs in `../gas/`.

## Key Files

- `index.html`: static frontend shell.
- `app.js`: main UI state, tabs, modals, rendering, and client behavior.
- `api.js`: browser-side API adapter.
- `style.css`: frontend styles.
- `api/gas.js`: Vercel route that proxies JSON actions to GAS.
- `api/photo.js`: Vercel route for photo proxying.
- `assets/`: frontend static assets.
- `vercel.json`: Vercel config.

## Git

Run Git commands from this directory:

```bash
git status --short --branch
git add .
git commit
push.git
```

The workspace root is not the Git repository.

After changing frontend code in this directory, tell the user the frontend needs `push.git`, or run `push.git` only when explicitly asked.

## Frontend API Rules

- Use `Api.call(...)` for backend calls.
- Do not use `google.script.run` in `web/`.
- Photo loading should go through the Vercel photo proxy, not direct Drive thumbnails.
- If a new frontend action is needed, add the matching backend handler in `../gas/Code_Api.js`.

## Legacy Mapping

If older notes mention these files, use the active split equivalents:

- Old `Index.html` -> `web/index.html`
- Old `JS_App.html` and other `JS_*.html` -> `web/app.js` or `web/api.js`
- Old `Stylesheet.html` -> `web/style.css`
- Old root `Code_*.js` -> `gas/Code_*.js`
