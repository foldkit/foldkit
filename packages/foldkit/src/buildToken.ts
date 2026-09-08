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
// Both sides are given the id explicitly rather than reading it from a
// compile-time constant inside this package. Vite externalizes an installed
// dependency from a server build, where a define never reaches it, so a
// framework-internal read is silently absent in exactly the production shape
// that matters. Application code is always transformed, so the entries read
// `import.meta.env.FOLDKIT_BUILD_ID` and pass what they find.

/** The attribute a hydratable render stamps the build id onto. */
export const HYDRATION_BUILD_ATTRIBUTE = 'data-foldkit-build'
