// The build id names the deployment a page came from. `renderToString` stamps it
// on the rendered root and `Runtime.hydrate` compares it before adopting
// anything, so a page from one deployment is never reconciled against a client
// from another.
//
// View identities cannot answer that question on their own. They move when the
// view they name changes, but what a view renders also depends on the constants
// it imports, the configuration it reads, and the arguments its caller passes. A
// component whose own source is untouched renders something different when its
// caller changes, and its identity is the one that wins on the element, so the
// DOM state on a stale page could otherwise be carried into a view that now
// means something else.
//
// The Vite plugin replaces this call while compiling the client and server
// artifacts. Leaving it as a function keeps direct Node use and builds without
// the plugin fail-closed: the framework sees no identity and refuses hydratable
// rendering or hydration instead of sharing a fallback across deployments.

const foldkitBuildIdPlaceholder = (): string | undefined => undefined

/** The build id compiled into this Foldkit artifact, when one was supplied.
 * @internal */
export const injectedBuildId = foldkitBuildIdPlaceholder()

/** Uses an explicit build id when present and the compiled artifact id otherwise.
 * @internal */
export const buildIdOrInjected = (
  buildId: string | undefined,
): string | undefined => (buildId === undefined ? injectedBuildId : buildId)

/** The attribute a hydratable render stamps the build id onto. */
export const HYDRATION_BUILD_ATTRIBUTE = 'data-foldkit-build'
