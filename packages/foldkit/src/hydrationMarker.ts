/** Attribute stamped on a hydratable server-rendered application root. Its
 *  nonempty value is the runtime id used to pair the root with its Flags
 *  payload and scope Model and scroll preservation. `makeApplication` locates
 *  the root; `Runtime.hydrate` adopts it. */
export const FOLDKIT_APP_ATTRIBUTE = 'data-foldkit-app'

/** Attribute on the JSON script tag carrying the Schema-encoded flags the
 *  server rendered with. A hydrating runtime decodes this payload instead of
 *  running the client `flags` Effect, so both sides call `init` with the
 *  same value. */
export const FOLDKIT_FLAGS_ATTRIBUTE = 'data-foldkit-flags'

/** Attribute stamped, with an empty value, on a hydratable root that an
 *  embedded program owns instead of the page. It sits beside
 *  {@link FOLDKIT_APP_ATTRIBUTE}, whose value is still the runtime id. A page
 *  holds at most one root without it, because that root's application owns the
 *  document, and any number of roots with it. `makeApplication` leaves roots
 *  that carry it alone; `Runtime.embed` adopts them. */
export const FOLDKIT_EMBED_ATTRIBUTE = 'data-foldkit-embed'
