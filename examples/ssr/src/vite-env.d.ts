/// <reference types="vite/client" />

// `@foldkit/vite-plugin` compiles the deployment's build id in here, from its
// `buildId` option or the `FOLDKIT_BUILD_ID` environment variable. The server
// entry hands it to `renderToString` and the client entry to `Runtime.hydrate`,
// which is how hydration tells a page from this deployment apart from one served
// by another.
//
// Declared as required rather than optional because this project's build always
// supplies one. A build that did not would produce `undefined` here, and both
// entries refuse it at runtime; typing it as optional would only push that
// failure past the compiler and into the served page.
interface ImportMetaEnv {
  readonly FOLDKIT_BUILD_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
