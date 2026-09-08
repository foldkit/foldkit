/** Attribute stamped on a hydratable server-rendered application root. Its
 *  nonempty value is the runtime id used to pair the root with its Flags
 *  payload and scope preserved HMR state. `makeApplication` locates the root;
 *  `Runtime.hydrate` adopts it. */
export const FOLDKIT_APP_ATTRIBUTE = 'data-foldkit-app'

/** Attribute on the JSON script tag carrying the Schema-encoded flags the
 *  server rendered with. A hydrating runtime decodes this payload instead of
 *  running the client `flags` Effect, so both sides call `init` with the
 *  same value. */
export const FOLDKIT_FLAGS_ATTRIBUTE = 'data-foldkit-flags'
