/** Attribute stamped on a hydratable server-rendered application root. Its
 *  nonempty value is the runtime id used to pair the root with its Flags
 *  payload and scope Model and scroll preservation. `makeApplication` locates
 *  the root; `Runtime.hydrate` adopts it. */
export const FOLDKIT_APP_ATTRIBUTE = 'data-foldkit-app'

/** Attribute `data-foldkit-build` on a hydratable server-rendered application
 *  root. Its value identifies the deployment that rendered the page. The client
 *  removes the attribute after successful adoption. A refused handoff retains
 *  the attribute. */
export const FOLDKIT_BUILD_ATTRIBUTE = 'data-foldkit-build'

/** Attribute on the JSON script tag carrying the Schema-encoded flags the
 *  server rendered with. A hydrating runtime decodes this payload instead of
 *  running the client `flags` Effect, so both sides call `init` with the
 *  same value. */
export const FOLDKIT_FLAGS_ATTRIBUTE = 'data-foldkit-flags'
