/** Attribute stamped on the server-rendered application root. Its presence
 *  tells a booting runtime to hydrate instead of rendering fresh, and its
 *  value is the runtime id used for HMR model preservation. */
export const FOLDKIT_APP_ATTRIBUTE = 'data-foldkit-app'

/** Attribute on the JSON script tag carrying the Schema-encoded flags the
 *  server rendered with. A hydrating runtime decodes this payload instead of
 *  running the client `flags` Effect, so both sides call `init` with the
 *  same value. */
export const FOLDKIT_FLAGS_ATTRIBUTE = 'data-foldkit-flags'
