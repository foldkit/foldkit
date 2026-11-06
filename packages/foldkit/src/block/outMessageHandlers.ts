import { Array, Predicate, Schema } from 'effect'

import { hasSameDecodedSchemaShape } from './decodedSchemaShape.js'

type AnyFunction = (...args: ReadonlyArray<any>) => any
type HandlerCases = Readonly<Record<string, unknown>>
type AuthoringMethod = 'makeOutMessageFold' | 'makeOutMessageForward'

const authoringContracts = new WeakSet<object>()
const localMessageContracts = new WeakMap<object, Schema.Top>()

/** @internal Allows policy authoring against known passive constructor contracts. */
export const registerAuthoringChildContract = (contract: object): void => {
  authoringContracts.add(contract)
}

/** @internal Retains the local Message contract behind an acquired complete child. */
export const registerChildLocalMessageContract = (
  child: object,
  message: Schema.Top,
): void => {
  localMessageContracts.set(child, message)
}

const childMessageContractOf = (child: unknown): Schema.Top | undefined => {
  if (!Predicate.isObject(child)) {
    return undefined
  }

  const localMessage = localMessageContracts.get(child)
  if (localMessage !== undefined) {
    return localMessage
  }

  const message = Reflect.get(child, 'Message')
  return Schema.isSchema(message) ? message : undefined
}

const handlerConfigurations = new WeakMap<
  object,
  Readonly<{
    method: AuthoringMethod
    cases: HandlerCases
    childMessage: Schema.Top | undefined
  }>
>()

/** @internal Recognizes an authored policy helper without invoking it. */
export const isOutMessageHandler = (handler: unknown): handler is AnyFunction =>
  Predicate.isFunction(handler) && handlerConfigurations.has(handler)

/** @internal Checks a handler record before its contextual child is available. */
export const assertOutMessageHandlerRecord: (
  cases: unknown,
  method: AuthoringMethod,
) => asserts cases is HandlerCases = (cases, method) => {
  if (!Predicate.isObject(cases) || globalThis.Array.isArray(cases)) {
    throw new Error(
      `[foldkit] Definition.${method} requires a record of variant handlers.`,
    )
  }
}

const assertHandlerFunctions = (
  cases: HandlerCases,
  tags: ReadonlyArray<string>,
  method: AuthoringMethod,
): void => {
  for (const tag of tags) {
    if (!Predicate.isFunction(Reflect.get(cases, tag))) {
      throw new Error(
        `[foldkit] Definition.${method} handler "${tag}" must be a function.`,
      )
    }
  }
}

/** @internal Validates exhaustive handlers against a completed child Block. */
export const assertChildOutMessageHandlers: (
  child: unknown,
  cases: unknown,
  method: AuthoringMethod,
) => asserts cases is HandlerCases = (child, cases, method) => {
  if (
    !Predicate.isObject(child) ||
    !Schema.isSchema(Reflect.get(child, 'Model')) ||
    childMessageContractOf(child) === undefined ||
    (!authoringContracts.has(child) &&
      (!Predicate.isFunction(Reflect.get(child, 'init')) ||
        !Predicate.isFunction(Reflect.get(child, 'update')) ||
        !Array.isArray(Reflect.get(child, 'bindings')) ||
        !Array.isArray(Reflect.get(child, 'hostHandlers'))))
  ) {
    throw new Error(
      `[foldkit] Definition.${method} requires a completed child Block.`,
    )
  }

  const outMessage = Reflect.get(child, 'OutMessage')
  if (!Schema.isSchema(outMessage)) {
    throw new Error(
      `[foldkit] Definition.${method} requires a child Block with an OutMessage Schema.`,
    )
  }

  const variants = Reflect.get(outMessage, 'cases')
  if (!Predicate.isObject(variants) || globalThis.Array.isArray(variants)) {
    throw new Error(
      `[foldkit] Definition.${method} requires a tagged child OutMessage union.`,
    )
  }

  assertOutMessageHandlerRecord(cases, method)

  const expectedTags = Object.keys(variants)
  const actualTags = Object.keys(cases)
  const missingTags = Array.filter(
    expectedTags,
    tag => !Object.hasOwn(cases, tag),
  )
  if (Array.isArrayNonEmpty(missingTags)) {
    throw new Error(
      `[foldkit] Definition.${method} is missing handlers for: ${missingTags.join(', ')}.`,
    )
  }

  const unexpectedTags = Array.filter(
    actualTags,
    tag => !Object.hasOwn(variants, tag),
  )
  if (Array.isArrayNonEmpty(unexpectedTags)) {
    throw new Error(
      `[foldkit] Definition.${method} received unexpected handlers for: ${unexpectedTags.join(', ')}.`,
    )
  }

  assertHandlerFunctions(cases, expectedTags, method)
}

/** @internal Retains helper cases for validation when a Binding supplies its child. */
export const registerOutMessageHandler = (
  handler: AnyFunction,
  child: unknown,
  cases: HandlerCases,
  method: AuthoringMethod,
): void => {
  assertHandlerFunctions(cases, Object.keys(cases), method)
  handlerConfigurations.set(handler, {
    cases,
    method,
    childMessage: childMessageContractOf(child),
  })
}

/** @internal Checks a known helper against its Binding and policy role without invoking handlers. */
export const validateOutMessageHandler = (
  handler: unknown,
  child: unknown,
  role: 'fold' | 'forward',
): void => {
  if (!Predicate.isFunction(handler)) {
    return
  }

  const configuration = handlerConfigurations.get(handler)
  if (configuration !== undefined) {
    const expectedMethod =
      role === 'fold' ? 'makeOutMessageFold' : 'makeOutMessageForward'
    if (configuration.method !== expectedMethod) {
      throw new Error(
        `[foldkit] Definition.${configuration.method} cannot supply an OutMessage ${role} policy. Use Definition.${expectedMethod}.`,
      )
    }

    const actualChildMessage = childMessageContractOf(child)
    if (
      configuration.method === 'makeOutMessageFold' &&
      configuration.childMessage !== undefined &&
      (actualChildMessage === undefined ||
        !hasSameDecodedSchemaShape(
          configuration.childMessage,
          actualChildMessage,
        ))
    ) {
      throw new Error(
        `[foldkit] Definition.${configuration.method} was authored for a different child Message contract than the selected Binding.`,
      )
    }

    assertChildOutMessageHandlers(
      child,
      configuration.cases,
      configuration.method,
    )
  }
}
