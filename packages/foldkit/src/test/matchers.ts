import { Option, Predicate, String } from 'effect'

import { serializedStylePropertyName } from '../domReflection.js'
import {
  type SceneElement,
  attrOfNode,
  fromSceneElement,
  isHidden,
  textContentOfNode,
} from './query.js'

type MatcherContext = Readonly<{ isNot: boolean }>

const describeExpected = (expected: string | RegExp): string =>
  expected instanceof RegExp ? `${expected}` : `"${expected}"`

const describeKey = (key: PropertyKey): string =>
  Predicate.isString(key) ? `"${key}"` : globalThis.String(key)

const textMatches = (value: string, expected: string | RegExp): boolean =>
  expected instanceof RegExp ? expected.test(value) : value === expected

const textIncludes = (value: string, expected: string | RegExp): boolean =>
  expected instanceof RegExp ? expected.test(value) : value.includes(expected)

/** Custom Vitest matchers for scene testing. Register with `expect.extend(Scene.sceneMatchers)`. */
export const sceneMatchers = {
  toHaveText(received: Option.Option<SceneElement>, expected: string | RegExp) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have text ${describeExpected(expected)} but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualText = textContentOfNode(vnode)
        return {
          pass: textMatches(actualText, expected),
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? `Expected element not to have text ${describeExpected(expected)} but it does.`
              : `Expected element to have text ${describeExpected(expected)} but received "${actualText}".`,
        }
      },
    })
  },

  toContainText(
    received: Option.Option<SceneElement>,
    expected: string | RegExp,
  ) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to contain text ${describeExpected(expected)} but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualText = textContentOfNode(vnode)
        return {
          pass: textIncludes(actualText, expected),
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? `Expected element not to contain text ${describeExpected(expected)} but it does.`
              : `Expected element to contain text ${describeExpected(expected)} but received "${actualText}".`,
        }
      },
    })
  },

  toHaveClass(received: Option.Option<SceneElement>, expected: string) {
    return Option.match(Option.map(received, fromSceneElement), {
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
    received: Option.Option<SceneElement>,
    name: string,
    expectedValue?: string,
  ) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          expectedValue === undefined
            ? `Expected element to have attribute "${name}" but the element does not exist.`
            : `Expected element to have attribute ${name}="${expectedValue}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualValue = attrOfNode(vnode, name)

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

  toExist(received: Option.Option<SceneElement>) {
    return {
      pass: Option.isSome(received),
      message: () =>
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        (this as unknown as MatcherContext).isNot
          ? 'Expected element not to exist but it does.'
          : 'Expected element to exist but it does not.',
    }
  },

  toBeAbsent(received: Option.Option<SceneElement>) {
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
    received: Option.Option<SceneElement>,
    name: string,
    expectedValue?: string,
  ) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          expectedValue === undefined
            ? `Expected element to have style "${name}" but the element does not exist.`
            : `Expected element to have style ${name}="${expectedValue}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const maybeActualValue = Option.fromNullishOr(
          vnode.data?.style?.[serializedStylePropertyName(name)],
        )

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
            const actual = globalThis.String(actualValue)
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

  toHaveHook(received: Option.Option<SceneElement>, name: string) {
    return Option.match(Option.map(received, fromSceneElement), {
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

  toHaveHandler(received: Option.Option<SceneElement>, name: string) {
    return Option.match(Option.map(received, fromSceneElement), {
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

  toHaveKey(received: Option.Option<SceneElement>, expected: PropertyKey) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have key ${describeKey(expected)} but the element does not exist.`,
      }),
      onSome: vnode =>
        Option.match(Option.fromNullishOr(vnode.key), {
          onNone: () => ({
            pass: false,
            message: () =>
              `Expected element to have key ${describeKey(expected)} but the element has no key.`,
          }),
          onSome: actual => ({
            pass: actual === expected,
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have key ${describeKey(expected)} but it does.`
                : `Expected element to have key ${describeKey(expected)} but received key ${describeKey(actual)}.`,
          }),
        }),
    })
  },

  toHaveValue(received: Option.Option<SceneElement>, expected: string) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have value "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualValue = attrOfNode(vnode, 'value')
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

  toBeDisabled(received: Option.Option<SceneElement>) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be disabled but the element does not exist.',
      }),
      onSome: vnode => {
        const disabled = attrOfNode(vnode, 'disabled')
        const ariaDisabled = attrOfNode(vnode, 'aria-disabled')
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

  toBeEnabled(received: Option.Option<SceneElement>) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be enabled but the element does not exist.',
      }),
      onSome: vnode => {
        const disabled = attrOfNode(vnode, 'disabled')
        const ariaDisabled = attrOfNode(vnode, 'aria-disabled')
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

  toBeEmpty(received: Option.Option<SceneElement>) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be empty but the element does not exist.',
      }),
      onSome: vnode => {
        const childCount = (vnode.children ?? []).length
        const text = textContentOfNode(vnode)
        const pass = String.isEmpty(text) && childCount === 0
        const actual: string = String.isNonEmpty(text)
          ? `received text "${text}"`
          : `received ${childCount} child(ren)`
        return {
          pass,
          message: (): string =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? 'Expected element not to be empty but it is.'
              : `Expected element to be empty but ${actual}.`,
        }
      },
    })
  },

  toBeVisible(received: Option.Option<SceneElement>) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be visible but the element does not exist.',
      }),
      onSome: vnode => {
        return {
          pass: !isHidden(vnode),
          message: () =>
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            (this as unknown as MatcherContext).isNot
              ? 'Expected element not to be visible but it is.'
              : 'Expected element to be visible but it is hidden.',
        }
      },
    })
  },

  toHaveId(received: Option.Option<SceneElement>, expected: string) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          `Expected element to have id "${expected}" but the element does not exist.`,
      }),
      onSome: vnode => {
        const actualId = attrOfNode(vnode, 'id')
        return Option.match(actualId, {
          onNone: () => ({
            pass: false,
            message: () =>
              `Expected element to have id "${expected}" but the element has no id.`,
          }),
          onSome: actual => ({
            pass: actual === expected,
            message: () =>
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              (this as unknown as MatcherContext).isNot
                ? `Expected element not to have id "${expected}" but it does.`
                : `Expected element to have id "${expected}" but received "${actual}".`,
          }),
        })
      },
    })
  },

  toBeChecked(received: Option.Option<SceneElement>) {
    return Option.match(Option.map(received, fromSceneElement), {
      onNone: () => ({
        pass: false,
        message: () =>
          'Expected element to be checked but the element does not exist.',
      }),
      onSome: vnode => {
        const checked = attrOfNode(vnode, 'checked')
        const ariaChecked = attrOfNode(vnode, 'aria-checked')
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
