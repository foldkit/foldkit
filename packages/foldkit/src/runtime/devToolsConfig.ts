import { Effect, Option, Schema, Scope, pipe } from 'effect'

import type { DevToolsStore } from '../devTools/store.js'
import { type Visibility, isVisible } from './visibility.js'

/** Position of the DevTools badge and panel on screen. */
export type DevToolsPosition =
  | 'BottomRight'
  | 'BottomLeft'
  | 'TopRight'
  | 'TopLeft'

/** Controls DevTools interaction mode.
 *
 * - `'Inspect'`: Messages stream in and clicking a row shows its state snapshot without pausing the rendered view.
 * - `'TimeTravel'`: Clicking a row installs a paused historical view while the live application continues. Resume to patch the latest live view.
 */
export type DevToolsMode = 'Inspect' | 'TimeTravel'

/** Mode value for the DevTools panel. Either a single mode used in every
 *  environment, or an object selecting different modes for development and
 *  production. Use the object form to keep `'TimeTravel'` for local debugging
 *  while shipping the safer `'Inspect'` mode to users. `'TimeTravel'` in
 *  production pauses the user's rendered view when a history row is clicked. */
export type DevToolsModeConfig =
  | DevToolsMode
  | Readonly<{ development: DevToolsMode; production: DevToolsMode }>

/**
 * Factory that mounts the in-browser DevTools overlay against a recording
 * store. The runtime keeps the store and the WebSocket bridge (so external
 * tooling like the DevTools MCP server works without an overlay); the visual
 * overlay is injected so it can live in `@foldkit/devtools` and pull in
 * `@foldkit/ui` without coupling the core runtime to either.
 *
 * Foldkit's Vite plugin supplies the installed overlay automatically. It is
 * included in production when `@foldkit/devtools` is a regular dependency.
 */
export type DevToolsOverlay = (
  store: DevToolsStore,
  position: DevToolsPosition,
  mode: DevToolsMode,
  maybeBanner: Option.Option<string>,
) => Effect.Effect<void, never, Scope.Scope>

/**
 * DevTools configuration.
 *
 * Pass `false` to disable DevTools entirely.
 *
 * - `show`: `'Development'` (default) enables in dev mode only, `'Always'` enables in all environments including production.
 * - `position`: Where the badge and panel appear. Defaults to `'BottomRight'`.
 * - `mode`: `'TimeTravel'` (default) enables full time-travel debugging by installing a paused historical view while the live application continues. `'Inspect'` allows browsing state snapshots without replacing the live view. Pass `{ development, production }` to use different modes per environment. Useful when DevTools is shown in production (`show: 'Always'`) and you want `'TimeTravel'` only in local development.
 * - `banner`: Optional text shown as a banner at the top of the panel.
 * - `excludeFromHistory`: Message `_tag` values whose dispatches should not be recorded in DevTools history. The Messages still drive `update` and the runtime as usual; they just don't appear in the history panel and don't pay the per-Message diff cost. Use for high-frequency Messages (animation frames, pointer moves, scroll events) that would flood history without adding insight.
 * - `maxEntries`: Maximum number of recorded Messages retained in history before the oldest is evicted. Defaults to 100. Clamped to the range 20-500: smaller values keep the panel snappy under high message rates, larger values give you more scroll-back. Each retained entry stores a full Model snapshot, so memory cost scales linearly with both `maxEntries` and your Model size.
 * - `keyframeInterval`: Number of recorded Messages between full Model snapshots. Defaults to 31. Time-travel to an index replays `update` forward from the nearest earlier keyframe, so this is a memory/time tradeoff: smaller values store more snapshots (more memory) but make each jump cheaper, down to `1` where every jump is a constant-time snapshot lookup with no replay. Reach for a denser interval when the app has a heavy `update` and time-travel jumps feel sluggish. Clamped to a minimum of 1. Forced to 1 automatically when `excludeFromHistory` is active, since excluded Messages are never replayed.
 */
export type DevToolsConfig =
  | false
  | Readonly<{
      show?: Visibility
      position?: DevToolsPosition
      mode?: DevToolsModeConfig
      banner?: string
      excludeFromHistory?: ReadonlyArray<string>
      maxEntries?: number
      keyframeInterval?: number
      /**
       * The application's `Message` Schema. When provided and the running app
       * is connected to the Foldkit DevTools MCP server, AI agents can dispatch
       * Messages into the runtime. The Schema decodes inbound dispatch payloads
       * at the bridge boundary and returns a clean error on mismatch.
       *
       * Without this field, `RequestDispatchMessage` is rejected with an
       * informative error.
       */
      Message?: Schema.Codec<any, any, unknown, unknown>
    }>

let registeredDevToolsOverlay: DevToolsOverlay | undefined

/** Registers the overlay supplied by the Foldkit Vite plugin. */
export const __setDevToolsOverlay = (
  overlay: DevToolsOverlay | undefined,
): void => {
  registeredDevToolsOverlay = overlay
}

const DEFAULT_DEV_TOOLS_SHOW: Visibility = 'Development'
const DEFAULT_DEV_TOOLS_POSITION: DevToolsPosition = 'BottomRight'
const DEFAULT_DEV_TOOLS_MODE: DevToolsMode = 'TimeTravel'

const resolveDevToolsMode = (config: DevToolsModeConfig): DevToolsMode => {
  if (typeof config === 'string') {
    return config
  } else {
    return import.meta.hot ? config.development : config.production
  }
}
const DEV_TOOLS_MAX_ENTRIES_MIN = 20
const DEV_TOOLS_MAX_ENTRIES_MAX = 500
const DEV_TOOLS_KEYFRAME_INTERVAL_MIN = 1

/** The DevTools settings a runtime boots with once `show` has been resolved
 *  against the environment. */
export type ResolvedDevToolsConfig = Readonly<{
  position: DevToolsPosition
  mode: DevToolsMode
  maybeBanner: Option.Option<string>
  maybeOverlay: Option.Option<DevToolsOverlay>
}>

/** Resolves the DevTools config for this boot, or `Option.none()` when
 *  DevTools is disabled or hidden. `'Development'` visibility requires Vite
 *  HMR and a top-level window, so an app previewed inside an iframe does not
 *  stack a second panel over its host's. */
export const resolveDevToolsConfig = (
  devTools: DevToolsConfig | undefined,
): Option.Option<ResolvedDevToolsConfig> => {
  const isInIframe = window.self !== window.top

  return pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.filter(config =>
      isVisible(
        config.show ?? DEFAULT_DEV_TOOLS_SHOW,
        !!import.meta.hot && !isInIframe,
      ),
    ),
    Option.map(config => ({
      position: config.position ?? DEFAULT_DEV_TOOLS_POSITION,
      mode: resolveDevToolsMode(config.mode ?? DEFAULT_DEV_TOOLS_MODE),
      maybeBanner: Option.fromNullishOr(config.banner),
      maybeOverlay: Option.fromNullishOr(registeredDevToolsOverlay),
    })),
  )
}

/** The Message tags `excludeFromHistory` keeps out of the DevTools history. */
export const resolveExcludeFromHistoryTags = (
  devTools: DevToolsConfig | undefined,
): ReadonlySet<string> =>
  pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.flatMapNullishOr(config => config.excludeFromHistory),
    Option.match({
      onNone: () => new Set<string>(),
      onSome: tags => new Set(tags),
    }),
  )

/** The configured `maxEntries`, clamped to the supported range. */
export const resolveDevToolsMaxEntries = (
  devTools: DevToolsConfig | undefined,
): number | undefined =>
  pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.flatMapNullishOr(config => config.maxEntries),
    Option.match({
      onNone: () => undefined,
      onSome: value =>
        Math.max(
          DEV_TOOLS_MAX_ENTRIES_MIN,
          Math.min(DEV_TOOLS_MAX_ENTRIES_MAX, value),
        ),
    }),
  )

/** The configured `keyframeInterval`, floored and clamped to its minimum. */
export const resolveDevToolsKeyframeInterval = (
  devTools: DevToolsConfig | undefined,
): number | undefined =>
  pipe(
    devTools ?? {},
    Option.liftPredicate(config => config !== false),
    Option.flatMapNullishOr(config => config.keyframeInterval),
    Option.match({
      onNone: () => undefined,
      onSome: value =>
        Math.max(DEV_TOOLS_KEYFRAME_INTERVAL_MIN, Math.floor(value)),
    }),
  )
