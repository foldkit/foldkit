/// <reference types="bun" preserve="true" />

import { type ExpectExtendMatchers, expect } from 'bun:test'

import { sceneMatchers } from './matchers.js'

declare module 'bun:test' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<T> {
    toHaveText(expected: string | RegExp): void
    toContainText(expected: string | RegExp): void
    toHaveClass(expected: string): void
    toHaveAttr(name: string, value?: string): void
    toHaveStyle(name: string, value?: string): void
    toHaveHook(name: string): void
    toHaveHandler(name: string): void
    toHaveValue(expected: string): void
    toBeDisabled(): void
    toBeEnabled(): void
    toBeChecked(): void
    toBeEmpty(): void
    toBeVisible(): void
    toHaveId(expected: string): void
    toExist(): void
    toBeAbsent(): void
  }
}

/** Registers Foldkit's Scene matchers with the `expect` from `bun:test`.
 *  Call once from a file that `bunfig.toml` preloads:
 *
 *  ```ts
 *  // bun-setup.ts
 *  import { setup } from 'foldkit/test/bun'
 *  setup()
 *  ```
 *
 *  Importing this module also adds the Scene matcher types to the `Matchers`
 *  interface of `bun:test`, so no manual `declare module 'bun:test'` block is
 *  needed. It requires Bun's type declarations from `@types/bun`. */
export const setup = (): void => {
  expect.extend(
    // NOTE: bun:test types the received value of a declared matcher as
    // `unknown`. Each Scene matcher receives the `Option` that a Locator
    // query returns, which Vitest's `any`-typed `extend` accepts as is.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    sceneMatchers as unknown as ExpectExtendMatchers<typeof sceneMatchers>,
  )
}
