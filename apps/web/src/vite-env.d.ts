/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_DEV_PROXY_ENABLED: string
  readonly VITE_DEV_SERVER_PORT: string
  readonly VITE_BUILD_SOURCEMAP: string
  readonly VITE_BUILD_MINIFY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENVIRONMENT: string
  readonly VITE_ENABLE_DEBUG_MODE: string
  readonly VITE_ENABLE_MOCK_DATA: string
  readonly VITE_AUTH_TOKEN_KEY: string
  readonly VITE_AUTH_SESSION_TIMEOUT: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_CONSOLE_LOGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
