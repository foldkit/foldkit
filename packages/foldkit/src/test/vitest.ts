import { expect } from 'vitest'

import { __setModelPreservationHotContext } from '../runtime/modelPreservationBridge.js'
import { sceneMatchers } from './matchers.js'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<R, T> {
    toHaveText(expected: string | RegExp): this
    toContainText(expected: string | RegExp): this
    toHaveClass(expected: string): this
    toHaveAttr(name: string, value?: string): this
    toHaveStyle(name: string, value?: string): this
    toHaveHook(name: string): this
    toHaveHandler(name: string): this
    toHaveValue(expected: string): this
    toBeDisabled(): this
    toBeEnabled(): this
    toBeChecked(): this
    toBeEmpty(): this
    toBeVisible(): this
    toHaveId(expected: string): this
    toExist(): this
    toBeAbsent(): this
  }
}

/** Registers Foldkit's Scene matchers with Vitest's `expect` and skips HMR
 *  Model restoration so Runtime startup does not wait for a Vite plugin response.
 *  Safe to call more than once. Call from your Vitest setup file:
 *
 *  ```ts
 *  // vitest-setup.ts
 *  import { setup } from 'foldkit/test/vitest'
 *  setup()
 *  ```
 *
 *  Importing this module also augments `Assertion<R, T>` with the Scene
 *  matcher types — no manual `declare module 'vitest'` block needed. */
export const setup = (): void => {
  __setModelPreservationHotContext(undefined)
  expect.extend(sceneMatchers)
}
