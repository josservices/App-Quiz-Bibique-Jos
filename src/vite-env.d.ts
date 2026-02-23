/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly SITE_URL?: string;
  readonly VITE_REQUIRE_LOGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
