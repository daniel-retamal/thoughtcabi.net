/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LINK_RELAY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
