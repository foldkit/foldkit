/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly FOLDKIT_BUILD_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
