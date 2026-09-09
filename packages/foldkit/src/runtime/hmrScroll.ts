import { Effect, Option, Schema } from 'effect'

/**
 * Window scroll offset persisted across a Vite HMR full reload. Held in
 * `sessionStorage` as a JSON string so it survives the reload and can be
 * reapplied synchronously at the next init render, before the browser paints.
 */
const PreservedScrollPosition = Schema.fromJsonString(
  Schema.Struct({ x: Schema.Number, y: Schema.Number }),
)
const encodePreservedScrollPosition = Schema.encodeUnknownSync(
  PreservedScrollPosition,
)
const decodePreservedScrollPosition = Schema.decodeUnknownOption(
  PreservedScrollPosition,
)

/** The `sessionStorage` key a runtime uses for its preserved scroll offset,
 *  scoped by runtime id so multiple runtimes never read each other's value. */
export const preservedScrollStorageKey = (runtimeId: string): string =>
  `foldkit:hmr-scroll:${runtimeId}`

/** Captures the current window scroll offset under the runtime's key. Called
 *  from the `vite:beforeFullReload` handler so the offset is stored just
 *  before Vite reloads the page. */
export const preserveScrollPosition = (runtimeId: string): void => {
  try {
    window.sessionStorage.setItem(
      preservedScrollStorageKey(runtimeId),
      encodePreservedScrollPosition({ x: window.scrollX, y: window.scrollY }),
    )
  } catch {
    // NOTE: sessionStorage throws when storage is disabled or blocked by a
    // privacy mode. Scroll restoration is a dev-only convenience, so a failure
    // here must never break the HMR reload this runs inside.
  }
}

/** Reads and clears the preserved scroll offset for a runtime. Returns
 *  `Option.none()` when nothing was preserved or the stored value is malformed.
 *  The key is removed on every call, so a stale offset from an earlier reload
 *  is never reapplied. */
export const takePreservedScrollPosition = (
  runtimeId: string,
): Option.Option<{ readonly x: number; readonly y: number }> => {
  try {
    const key = preservedScrollStorageKey(runtimeId)
    const maybeRaw = Option.fromNullishOr(window.sessionStorage.getItem(key))
    window.sessionStorage.removeItem(key)
    return Option.flatMap(maybeRaw, decodePreservedScrollPosition)
  } catch {
    return Option.none()
  }
}

/** Reapplies the preserved scroll offset with an instant (non-smooth) jump,
 *  defeating any CSS `scroll-behavior: smooth`. A no-op when nothing was
 *  preserved. Consumes the stored offset, so a second call restores nothing. */
export const restorePreservedScrollPosition = (
  runtimeId: string,
): Effect.Effect<void> =>
  Effect.sync(() => {
    const maybeScrollPosition = takePreservedScrollPosition(runtimeId)
    if (Option.isSome(maybeScrollPosition)) {
      const { x, y } = maybeScrollPosition.value
      window.scrollTo({ left: x, top: y, behavior: 'instant' })
    }
  })
