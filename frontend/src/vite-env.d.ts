/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the API base URL. Defaults to `/api` (proxied by Vite). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
