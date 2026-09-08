// A second SSR input whose module scope touches the DOM. Prerendering must
// never import it: it is not the configured entry, and importing it would run
// this in Node with the build process's privileges.
document.title = 'this module must never be imported by a build'

export const unrelated = true
