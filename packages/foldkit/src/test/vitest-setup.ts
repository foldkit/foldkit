import { expect } from 'vitest'

import { sceneMatchers } from './matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    toHaveText(expected: string): this
    toContainText(expected: string): this
    toHaveClass(expected: string): this
    toHaveAttr(name: string, value?: string): this
    toHaveStyle(name: string, value?: string): this
    toHaveHook(name: string): this
    toHaveHandler(name: string): this
    toHaveValue(expected: string): this
    toBeDisabled(): this
    toBeEnabled(): this
    toBeChecked(): this
    toExist(): this
    toBeAbsent(): this
  }
}

expect.extend(sceneMatchers)
