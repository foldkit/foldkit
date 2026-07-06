import { Array, Effect, Option, pipe } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isCallExpression } from '../guards.ts'

const MOUNT_DEFINITION_METHODS = ['define', 'defineStream']

const NO_ELEMENT_PARAMETER_MESSAGE =
  'This Mount factory never receives the element: it declares no usable element parameter. A Mount exists for element-caused, element-targeted work. If the element is irrelevant, use a Command, Subscription, or ManagedResource instead.'

const ignoredElementParameterMessage = (parameterName: string): string =>
  `The element parameter \`${parameterName}\` is named as ignored. A Mount factory must read or write its live element; if the element does not matter here, the side effect has a different cause and belongs in a Command, Subscription, or ManagedResource.`

const unusedElementParameterMessage = (parameterName: string): string =>
  `The element parameter \`${parameterName}\` is never referenced in this Mount factory. A Mount factory must use its live element; work that does not need the element belongs in a Command, Subscription, or ManagedResource.`

type FactoryFunction = ESTree.ArrowFunctionExpression | ESTree.Function

const isFactoryFunction = (node: ESTree.Node): node is FactoryFunction =>
  node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression'

const isMountDefinitionChain = (call: ESTree.CallExpression): boolean => {
  if (call.callee.type === 'MemberExpression') {
    return AST.isMember(call.callee, 'Mount', MOUNT_DEFINITION_METHODS)
  }
  if (call.callee.type === 'CallExpression') {
    return isMountDefinitionChain(call.callee)
  }
  return false
}

const returnedFactoryFunction = (
  statement: ESTree.Directive | ESTree.Statement,
): Option.Option<FactoryFunction> => {
  if (statement.type !== 'ReturnStatement' || statement.argument === null) {
    return Option.none()
  }
  return isFactoryFunction(statement.argument)
    ? Option.some(statement.argument)
    : Option.none()
}

const descendToElementFactory = (builder: FactoryFunction): FactoryFunction => {
  const body = builder.body
  if (body === null) return builder
  if (isFactoryFunction(body)) return body
  if (body.type === 'BlockStatement') {
    return pipe(
      body.body,
      Array.findFirst(returnedFactoryFunction),
      Option.getOrElse(() => builder),
    )
  }
  return builder
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const shadowsParameterName = (
  functionNode: Record<string, unknown>,
  parameterName: string,
): boolean => {
  const parameters = functionNode.params
  if (!isRecord(parameters)) return false
  return Object.values(parameters).some(
    parameter =>
      isRecord(parameter) &&
      parameter.type === 'Identifier' &&
      parameter.name === parameterName,
  )
}

const referencesName = (value: unknown, parameterName: string): boolean => {
  if (!isRecord(value)) return false
  if (value.type === 'Identifier' && value.name === parameterName) return true
  if (
    (value.type === 'ArrowFunctionExpression' ||
      value.type === 'FunctionExpression') &&
    shadowsParameterName(value, parameterName)
  ) {
    return false
  }
  if (value.type === 'Property') {
    const computedKeyReferences =
      value.computed === true && referencesName(value.key, parameterName)
    return computedKeyReferences || referencesName(value.value, parameterName)
  }
  return Object.entries(value).some(
    ([key, child]) => key !== 'parent' && referencesName(child, parameterName),
  )
}

const elementFactoryDiagnostic = (
  factory: FactoryFunction,
): Option.Option<string> => {
  const [firstParameter] = factory.params
  if (firstParameter === undefined || firstParameter.type !== 'Identifier') {
    return Option.some(NO_ELEMENT_PARAMETER_MESSAGE)
  }
  if (firstParameter.name.startsWith('_')) {
    return Option.some(ignoredElementParameterMessage(firstParameter.name))
  }
  return referencesName(factory.body, firstParameter.name)
    ? Option.none()
    : Option.some(unusedElementParameterMessage(firstParameter.name))
}

/** Flags applied Mount.define and Mount.defineStream factories that never use their element parameter. A Mount exists for element-caused, element-targeted work; a factory that ignores the element belongs in a Command, Subscription, or ManagedResource. */
export const mountFactoryMustUseElement = Rule.define({
  name: 'mount-factory-must-use-element',
  meta: Rule.meta({
    type: 'suggestion',
    description: 'Require Mount factories to use their live element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void
        if (
          node.callee.type !== 'CallExpression' ||
          !isMountDefinitionChain(node.callee)
        ) {
          return Effect.void
        }
        const [factoryArgument] = node.arguments
        if (
          factoryArgument === undefined ||
          !isFactoryFunction(factoryArgument)
        ) {
          return Effect.void
        }
        const elementFactory = descendToElementFactory(factoryArgument)
        return Option.match(elementFactoryDiagnostic(elementFactory), {
          onNone: () => Effect.void,
          onSome: message =>
            ctx.report(Diagnostic.make({ node: elementFactory, message })),
        })
      },
    }
  },
})
