/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly SITE_URL?: string;
  readonly VITE_REQUIRE_LOGIN?: string;
  readonly VITE_APP_USER?: string;
  readonly VITE_APP_PASSWORD?: string;
  readonly VITE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
