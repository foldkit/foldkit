import { Scene } from 'foldkit'
import { expect } from 'vitest'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T> {
    toHaveText(expected: string | RegExp): this
    toContainText(expected: string | RegExp): this
    toHaveClass(expected: string): this
    toHaveAttr(name: string, value?: string): this
    toHaveStyle(name: string, value?: string): this
    toHaveHook(name: string): this
    toHaveHandler(name: string): this
    toHaveValue(expected: string): this
    toHaveId(expected: string): this
    toHaveAccessibleName(expected: string): this
    toHaveAccessibleDescription(expected: string): this
    toBeDisabled(): this
    toBeEnabled(): this
    toBeChecked(): this
    toBeVisible(): this
    toBeEmpty(): this
    toExist(): this
    toBeAbsent(): this
    toHaveCount(expected: number): this
  }
}

expect.extend(Scene.sceneMatchers)
