import { defineConfig } from 'vite'

// NOTE: the build scripts share the application's sources but not its plugins.
// Foldkit's view-identity transform rewrites arrow functions, and Playwright
// serializes some of these scripts' callbacks into the browser, where that
// rewrite has nothing to call. Nothing in the scripts' module graph needs a
// plugin, so this config has none. It can go once the view-identity transform
// is scoped to application sources, or once a script runner lets a build opt
// out of the application config.
export default defineConfig({})
