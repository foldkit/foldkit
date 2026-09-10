import type { Plugin } from 'vite'

// The build id names the deployment a page came from. The server stamps it on
// the rendered root, the client carries it, and hydration refuses a page whose
// id is not its own before it adopts any DOM.
//
// Per-view identities cannot answer that question. They move when the view they
// name changes, but what a view renders also depends on the constants it
// imports, the configuration it reads, the dependencies it calls, and the
// arguments its caller passes. A component whose own source is untouched renders
// something different when its caller changes, and its identity is the one that
// wins on the element, so a stale page's `<input name="email">` can otherwise be
// adopted for a new build's `<input name="ssn">`, carrying what a visitor typed
// into a field that submits under a different name.
//
// The id is supplied by the deployment rather than derived from the project.
// Deriving it was tried and does not hold: a digest of the files under the Vite
// root misses shared modules from elsewhere in a monorepo, untracked inputs, and
// environment-derived configuration, so two deployments that render differently
// can share an id; it moves when a build writes output the next build reads, so
// one deployment can produce two ids; and hashing whatever files happen to sit
// in the project turns a value published in HTML into an oracle for the secrets
// among them. A value the deployment already has (a commit, a release tag, a
// container digest) has none of those problems.
//
// This plugin only compiles the id into application code. Foldkit itself is an
// ordinary dependency that Vite externalizes from a server build, where a
// compile-time define never reaches it, so the id is handed to `renderToString`
// and `Runtime.hydrate` explicitly rather than read from inside the framework.
//
// Development is compiled an id too. The dev SSR host renders through
// `renderToString` like any other, and a hydratable render refuses to run
// without one, so leaving development unnamed would fail every dev page
// request.

const BUILD_ID_ENVIRONMENT_VARIABLE = 'FOLDKIT_BUILD_ID'

/** The build id this build was given, from the plugin option or
 *  `FOLDKIT_BUILD_ID`, or `undefined` when the deployment supplied neither.
 *
 * @internal Exported for tests.
 */
export const resolveBuildId = (configured?: string): string | undefined => {
  if (configured !== undefined && configured !== '') {
    return configured
  }
  const fromEnvironment = process.env[BUILD_ID_ENVIRONMENT_VARIABLE]
  return fromEnvironment !== undefined && fromEnvironment !== ''
    ? fromEnvironment
    : undefined
}

// The id development serves. Development is the one place a constant is right:
// one live source session supplies both the server and client transforms rather
// than producing independently deployable artifacts. A value that moved would
// only make the dev server disagree with the tab already open against it. A
// hydratable render still requires an id, so development has to be given one
// rather than left without.
//
// It is exactly wrong for a build, which is why a build with no id is refused
// rather than defaulted: two deployments sharing an id is the case the id
// exists to catch.
const DEVELOPMENT_BUILD_ID = 'development'

/** The value `import.meta.env.FOLDKIT_BUILD_ID` compiles to, or `undefined`
 *  when a build was given no id and must refuse to render a hydratable page.
 *
 * @internal Exported for tests.
 */
export const buildIdForCommand = (
  command: 'build' | 'serve',
  configured?: string,
): string | undefined => {
  const resolved = resolveBuildId(configured)
  if (resolved !== undefined) {
    return resolved
  }
  return command === 'serve' ? DEVELOPMENT_BUILD_ID : undefined
}

/**
 * Compiles the deployment's build id into application code as
 * `import.meta.env.FOLDKIT_BUILD_ID`, for the client entry and the server entry
 * to hand to `Runtime.hydrate` and `renderToString`.
 *
 * A build takes the id from the `buildId` option or `FOLDKIT_BUILD_ID` and
 * compiles nothing when it was given neither, so a hydratable render fails with
 * `MissingBuildId` rather than serving a page hydration cannot place.
 * Development serves a fixed id instead because one live source session
 * supplies both transforms and has no deployment identity to derive.
 */
export const foldkitBuildToken = (buildId?: string): Plugin => ({
  name: 'foldkit:build-token',
  config: (_config, { command }) => {
    const resolved = buildIdForCommand(command, buildId)
    return resolved === undefined
      ? {}
      : {
          define: {
            'import.meta.env.FOLDKIT_BUILD_ID': JSON.stringify(resolved),
          },
        }
  },
})
