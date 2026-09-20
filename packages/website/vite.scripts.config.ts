import { defineConfig } from 'vite'

// NOTE: These scripts need Vite to resolve shared application modules, but they
// are not application builds. Keep application plugins disabled: the
// view-identity transform would add branding calls inside callbacks that
// Playwright serializes into the browser, where the imported helper is
// unavailable.
export default defineConfig({})
