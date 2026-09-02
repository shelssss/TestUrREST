# Frontend — API Management & Monitoring

React + TypeScript + Vite + Tailwind CSS.

## Setup

```bash
cd frontend
npm install
```

## Run

```bash
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:8000`, so the browser
only ever talks to one origin and CORS stays out of the way. Point it
elsewhere with `VITE_API_PROXY_TARGET`, or bypass the proxy entirely with
`VITE_API_URL`.

**The backend must be running**, or every page shows its error state.

## Other commands

```bash
npm run build      # typecheck + production build into dist/
npm run typecheck  # types only
npm run preview    # serve the production build
```

## Structure

```
src/
  components/
    ui/           buttons, fields, modal, badges, states, JSON viewer
    layout/       sidebar, top bar, project selector, icons
    charts/       Recharts wrappers + the validated colour theme
    tables/       table shell + server-side pagination
    endpoints/    endpoint form
    logs/         recent-requests feed
    api-explorer/ key-value editor, response viewer
    projects/     project form
  pages/          one directory per route
  services/api/   the only place fetch() is called
  hooks/          useAsync, useDebounced, useTheme, useClipboard
  context/        selected-project state
  routes/         router, project guard, error boundary
  types/          types mirroring the backend schemas
  utils/          formatting, HTTP presentation, class names
```

## Notes on a few decisions

**All HTTP goes through `services/api/client.ts`.** Components never call
`fetch`. Errors arrive as `ApiError` carrying the backend's own message and
any field-level validation errors, so forms can attach messages to inputs
without duplicating the backend's rules.

**The selected project lives in context, not the URL.** Switching projects
from the top bar keeps you on the page you were already on — one project's
Logs to another's Logs — which is how the tool is actually used.

**Refetching does not flash a skeleton.** `useAsync` distinguishes the first
load from a refresh; a refresh dims the existing render instead of tearing
it down, so the layout never jumps.

**Chart colours were validated, not chosen by eye.** Success/failure uses a
blue/red pair rather than the intuitive green/red: green vs red measures a
colour-blind separation of ΔE 4.1 under deuteranopia (indistinguishable for
roughly 6% of men, and too low for labels to compensate), while blue/red
measures 25.7. Both themes are separately validated against their own
surface colour. See `components/charts/chartTheme.ts`.

**The JSON viewer is hand-written.** It needs collapsing, search that
auto-expands to reveal matches, and the app's own token colours; a generic
package fights all three. Values are rendered as text nodes, never injected
as HTML, so a response body containing markup cannot execute.
