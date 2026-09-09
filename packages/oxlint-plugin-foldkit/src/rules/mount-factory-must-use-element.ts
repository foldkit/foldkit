import { Array, Effect, Option, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isCallExpression,
  isObjectExpression,
  resolveFoldkitApiPath,
} from '../guards.ts'

const MOUNT_DEFINITION_METHODS = ['define', 'defineStream']

const isMountDefinitionCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (references === undefined) {
    return AST.isCallOf(node, 'Mount', MOUNT_DEFINITION_METHODS)
  }

  return Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
    const [namespace, methodName, extraMember] = path

    return (
      namespace === 'Mount' &&
      methodName !== undefined &&
      MOUNT_DEFINITION_METHODS.includes(methodName) &&
      extraMember === undefined
    )
  })
}

const ELEMENT_FIELD = 'element'

const NO_ELEMENT_BINDING_MESSAGE = `This Mount's \`execute\` never receives the element: it does not destructure \`element\` from its input. A Mount exists for element-caused, element-targeted work. If the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

const ignoredElementBindingMessage = (bindingName: string): string =>
  `The element binding \`${bindingName}\` is named as ignored. A Mount's \`execute\` must read or write its live element; if the element does not matter here, the side effect has a different cause and belongs in a Command, Subscription, or ManagedResource.`

const unusedElementBindingMessage = (bindingName: string): string =>
  `The element binding \`${bindingName}\` is never referenced in this Mount's \`execute\`. A Mount's \`execute\` must use its live element; work that does not need the element belongs in a Command, Subscription, or ManagedResource.`

const unreadElementFieldMessage = (bindingName: string): string =>
  `This Mount's \`execute\` reads other fields off \`${bindingName}\` but never its \`element\`. Destructure \`element\` from the input so the check can see the read, or if the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

const unusedInputMessage = (bindingName: string): string =>
  `This Mount's \`execute\` never references \`${bindingName}\`, so it never reaches the live element. Destructure \`element\` from the input so the check can see the read, or if the element is irrelevant, use a Command, Subscription, or ManagedResource instead.`

type ExecuteFunction = ESTree.ArrowFunctionExpression | ESTree.Function

const isExecuteFunction = (node: ESTree.Node): node is ExecuteFunction =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const shadowsBindingName = (
  functionNode: Record<string, unknown>,
  bindingName: string,
): boolean => {
  const parameters = functionNode.params
  if (!isRecord(parameters)) return false
  return Object.values(parameters).some(
    parameter =>
      isRecord(parameter) &&
      parameter.type === 'Identifier' &&
      parameter.name === bindingName,
  )
}

const referencesName = (value: unknown, bindingName: string): boolean => {
  if (!isRecord(value)) return false
  if (value.type === 'Identifier' && value.name === bindingName) return true
  if (
    (value.type === 'ArrowFunctionExpression' ||
      value.type === 'FunctionExpression') &&
    shadowsBindingName(value, bindingName)
  ) {
    return false
  }
  if (value.type === 'MemberExpression' && value.computed !== true) {
    return referencesName(value.object, bindingName)
  }
  if (value.type === 'Property') {
    const computedKeyReferences =
      value.computed === true && referencesName(value.key, bindingName)
    return computedKeyReferences || referencesName(value.value, bindingName)
  }
  return Object.entries(value).some(
    ([key, child]) => key !== 'parent' && referencesName(child, bindingName),
  )
}

type InputUse = 'Element' | 'OtherField' | 'MaybeElement'

const inputUses = (
  value: unknown,
  inputName: string,
): ReadonlyArray<InputUse> => {
  if (!isRecord(value)) return []

  if (
    value.type === 'MemberExpression' &&
    isRecord(value.object) &&
    value.object.type === 'Identifier' &&
    value.object.name === inputName
  ) {
    if (value.computed === true) return ['MaybeElement']

    return isRecord(value.property) &&
      value.property.type === 'Identifier' &&
      value.property.name === ELEMENT_FIELD
      ? ['Element']
      : ['OtherField']
  }

  if (value.type === 'MemberExpression' && value.computed !== true) {
    return inputUses(value.object, inputName)
  }

  if (
    (value.type === 'ArrowFunctionExpression' ||
      value.type === 'FunctionExpression') &&
    shadowsBindingName(value, inputName)
  ) {
    return []
  }

  if (value.type === 'Property') {
    const keyUses =
      value.computed === true ? inputUses(value.key, inputName) : []

    return [...keyUses, ...inputUses(value.value, inputName)]
  }

  if (value.type === 'Identifier' && value.name === inputName) {
    return ['MaybeElement']
  }

  return Object.entries(value).flatMap(([key, child]) =>
    key === 'parent' ? [] : inputUses(child, inputName),
  )
}

const elementProperty = (
  pattern: ESTree.ObjectPattern,
): Option.Option<ESTree.BindingProperty> =>
  pipe(
    pattern.properties,
    Array.findFirst(
      (property): property is ESTree.BindingProperty =>
        property.type === 'Property' &&
        (property.key.type === 'Literal'
          ? property.key.value === ELEMENT_FIELD
          : !property.computed &&
            property.key.type === 'Identifier' &&
            property.key.name === ELEMENT_FIELD),
    ),
  )

const restBindingName = (
  pattern: ESTree.ObjectPattern,
): Option.Option<string> =>
  pipe(
    pattern.properties,
    Array.findFirst(property =>
      property.type === 'RestElement' && property.argument.type === 'Identifier'
        ? Option.some(property.argument.name)
        : Option.none<string>(),
    ),
  )

const withoutDefault = (value: ESTree.Node): ESTree.Node =>
  value.type === 'AssignmentPattern' ? value.left : value

const bindingDiagnostic = (
  execute: ExecuteFunction,
  bindingName: string,
): Option.Option<string> => {
  if (bindingName.startsWith('_')) {
    return Option.some(ignoredElementBindingMessage(bindingName))
  }
  return referencesName(execute.body, bindingName)
    ? Option.none()
    : Option.some(unusedElementBindingMessage(bindingName))
}

const unpackedDiagnostic = (
  execute: ExecuteFunction,
  bindingName: string,
): Option.Option<string> => {
  const uses = inputUses(execute.body, bindingName)

  if (Array.isReadonlyArrayEmpty(uses)) {
    return Option.some(unusedInputMessage(bindingName))
  }

  return uses.every(use => use === 'OtherField')
    ? Option.some(unreadElementFieldMessage(bindingName))
    : Option.none()
}

const executeDiagnostic = (execute: ExecuteFunction): Option.Option<string> => {
  const [firstParameter] = execute.params

  if (firstParameter === undefined) {
    return Option.some(NO_ELEMENT_BINDING_MESSAGE)
  }

  if (firstParameter.type === 'Identifier') {
    return unpackedDiagnostic(execute, firstParameter.name)
  }

  if (firstParameter.type !== 'ObjectPattern') {
    return Option.some(NO_ELEMENT_BINDING_MESSAGE)
  }

  return Option.match(elementProperty(firstParameter), {
    onNone: () =>
      Option.match(restBindingName(firstParameter), {
        onNone: () => Option.some(NO_ELEMENT_BINDING_MESSAGE),
        onSome: restName => unpackedDiagnostic(execute, restName),
      }),
    onSome: property => {
      const pattern = withoutDefault(property.value)

      return pattern.type === 'Identifier'
        ? bindingDiagnostic(execute, pattern.name)
        : Option.none<string>()
    },
  })
}

const executeFunction = (
  node: ESTree.CallExpression,
): Option.Option<ExecuteFunction> =>
  pipe(
    Array.get(node.arguments, 1),
    Option.filter(isObjectExpression),
    Option.flatMap(config => AST.objectGetValue(config, 'execute')),
    Option.filter(isExecuteFunction),
  )

/** Flags Mount.define and Mount.defineStream definitions whose `execute` never uses its element. A Mount exists for element-caused, element-targeted work; work that ignores the element belongs in a Command, Subscription, or ManagedResource. */
export const mountFactoryMustUseElement = Rule.define({
  name: 'mount-factory-must-use-element',
  meta: Rule.meta({
    type: 'suggestion',
    description: "Require a Mount's execute to use its live element.",
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !isMountDefinitionCall(node, references)
        ) {
          return Effect.void
        }
        return Option.match(executeFunction(node), {
          onNone: () => Effect.void,
          onSome: execute =>
            Option.match(executeDiagnostic(execute), {
              onNone: () => Effect.void,
              onSome: message =>
                ctx.report(Diagnostic.make({ node: execute, message })),
            }),
        })
      },
    }
  },
})
