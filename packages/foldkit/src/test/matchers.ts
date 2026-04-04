import { Option } from 'effect'

import type { VNode } from '../vdom'
import { attr, textContent } from './query'

type MatcherContext = Readonly<{ isNot: boolean }>

/** Custom Vitest matchers for scene testing. Register with `expect.extend(Scene.sceneMatchers)`. */
export const sceneMatchers = {
  toHaveText(received: Option.Option<VNode>, expected: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have text "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualText = textContent(vnode)
        return {
          pass: actualText === expected,
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? `Expected element not to have text "${expected}" but it does.`
              : `Expected element to have text "${expected}" but received "${actualText}".`,
        }
      },
    })
  },

  toContainText(received: Option.Option<VNode>, expected: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to contain text "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualText = textContent(vnode)
        return {
          pass: actualText.includes(expected),
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? `Expected element not to contain text "${expected}" but it does.`
              : `Expected element to contain text "${expected}" but received "${actualText}".`,
        }
      },
    })
  },

  toHaveClass(received: Option.Option<VNode>, expected: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have class "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => ({
        pass: vnode.data?.class?.[expected] === true,
        message: () =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          (this as unknown as MatcherContext).isNot
            ? `Expected element not to have class "${expected}" but it does.`
            : `Expected element to have class "${expected}" but it does not.`,
      }),
    })
  },

  toHaveAttr(
    received: Option.Option<VNode>,
    name: string,
    expectedValue?: string,
  ) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          expectedValue === undefined
            ? `Expected element to have attribute "${name}" but the element does not exist.`
            : `Expected element to have attribute ${name}="${expectedValue}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualValue = attr(vnode, name)

        if (expectedValue === undefined) {
          return {
            pass: Option.isSome(actualValue),
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have attribute "${name}" but it does.`
                : `Expected element to have attribute "${name}" but it is not present.`,
          }
        }

        return Option.match(actualValue, {
          onNone: () => ({
            pass: false,
            message: () =>
              `Expected element to have attribute ${name}="${expectedValue}" but the attribute is not present.`,
          }),
          onSome: actual => ({
            pass: actual === expectedValue,
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have attribute ${name}="${expectedValue}" but it does.`
                : `Expected element to have attribute ${name}="${expectedValue}" but received "${actual}".`,
          }),
        })
      },
    })
  },

  toExist(received: Option.Option<VNode>) {
    return {
      pass: Option.isSome(received),
      message: () =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (this as unknown as MatcherContext).isNot
          ? 'Expected element not to exist but it does.'
          : 'Expected element to exist but it does not.',
    }
  },

  toBeAbsent(received: Option.Option<VNode>) {
    return {
      pass: Option.isNone(received),
      message: () =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (this as unknown as MatcherContext).isNot
          ? 'Expected element not to be absent but it is.'
          : 'Expected element to be absent but it exists.',
    }
  },

  toHaveStyle(
    received: Option.Option<VNode>,
    name: string,
    expectedValue?: string,
  ) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          expectedValue === undefined
            ? `Expected element to have style "${name}" but the element does not exist.`
            : `Expected element to have style ${name}="${expectedValue}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const maybeActualValue = Option.fromNullable(vnode.data?.style?.[name])

        if (expectedValue === undefined) {
          return {
            pass: Option.isSome(maybeActualValue),
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have style "${name}" but it does.`
                : `Expected element to have style "${name}" but it is not present.`,
          }
        }

        return Option.match(maybeActualValue, {
          onNone: () => ({
            pass: false,
            message: () =>
              `Expected element to have style ${name}="${expectedValue}" but the style is not present.`,
          }),
          onSome: actualValue => {
            const actual = String(actualValue)
            return {
              pass: actual === expectedValue,
              message: () =>
                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                (this as unknown as MatcherContext).isNot
                  ? `Expected element not to have style ${name}="${expectedValue}" but it does.`
                  : `Expected element to have style ${name}="${expectedValue}" but received "${actual}".`,
            }
          },
        })
      },
    })
  },

  toHaveHook(received: Option.Option<VNode>, name: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have hook "${name}" but the element does not exist.`,
      }),
      onSome: vnode => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const hooks = vnode.data?.hook as Record<string, unknown> | undefined
        return {
          pass: typeof hooks?.[name] === 'function',
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? `Expected element not to have hook "${name}" but it does.`
              : `Expected element to have hook "${name}" but it is not present.`,
        }
      },
    })
  },

  toHaveHandler(received: Option.Option<VNode>, name: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have handler "${name}" but the element does not exist.`,
      }),
      onSome: vnode => ({
        pass: vnode.data?.on?.[name] !== undefined,
        message: () =>
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          (this as unknown as MatcherContext).isNot
            ? `Expected element not to have handler "${name}" but it does.`
            : `Expected element to have handler "${name}" but it is not present.`,
      }),
    })
  },

  toHaveValue(received: Option.Option<VNode>, expected: string) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have value "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualValue = attr(vnode, 'value')
        return Option.match(actualValue, {
          onNone: () => ({
            pass: false,
            message: () =>
              `Expected element to have value "${expected}" but the element has no value.`,
          }),
          onSome: actual => ({
            pass: actual === expected,
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have value "${expected}" but it does.`
                : `Expected element to have value "${expected}" but received "${actual}".`,
          }),
        })
      },
    })
  },

  toBeDisabled(received: Option.Option<VNode>) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be disabled but the element does not exist.',
      }),
      onSome: vnode => {
        const disabled = attr(vnode, 'disabled')
        const ariaDisabled = attr(vnode, 'aria-disabled')
        const pass =
          (Option.isSome(disabled) && disabled.value !== 'false') ||
          (Option.isSome(ariaDisabled) && ariaDisabled.value === 'true')
        return {
          pass,
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? 'Expected element not to be disabled but it is.'
              : 'Expected element to be disabled but it is not.',
        }
      },
    })
  },

  toBeEnabled(received: Option.Option<VNode>) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be enabled but the element does not exist.',
      }),
      onSome: vnode => {
        const disabled = attr(vnode, 'disabled')
        const ariaDisabled = attr(vnode, 'aria-disabled')
        const isDisabled =
          (Option.isSome(disabled) && disabled.value !== 'false') ||
          (Option.isSome(ariaDisabled) && ariaDisabled.value === 'true')
        return {
          pass: !isDisabled,
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? 'Expected element not to be enabled but it is.'
              : 'Expected element to be enabled but it is disabled.',
        }
      },
    })
  },

  toBeChecked(received: Option.Option<VNode>) {
    return Option.match(received, {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be checked but the element does not exist.',
      }),
      onSome: vnode => {
        const checked = attr(vnode, 'checked')
        const ariaChecked = attr(vnode, 'aria-checked')
        const pass =
          (Option.isSome(checked) && checked.value !== 'false') ||
          (Option.isSome(ariaChecked) && ariaChecked.value === 'true')
        return {
          pass,
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? 'Expected element not to be checked but it is.'
              : 'Expected element to be checked but it is not.',
        }
      },
    })
  },
}
