import { Match } from 'effect'

/** Controls when a feature is shown. */
export type Visibility = 'Development' | 'Always'

/** Whether a feature configured with `show` is enabled. `'Always'` enables it
 *  everywhere. `'Development'` enables it only when `isDevelopment` is true.
 *  Callers pass whether Vite HMR is active, and DevTools also requires a
 *  top-level window. */
export const isVisible = (show: Visibility, isDevelopment: boolean): boolean =>
  Match.value(show).pipe(
    Match.when('Always', () => true),
    Match.when('Development', () => isDevelopment),
    Match.exhaustive,
  )
