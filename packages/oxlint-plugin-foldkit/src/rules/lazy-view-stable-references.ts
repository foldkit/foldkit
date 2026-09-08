import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
  type ScopeManager,
  type Variable,
} from 'effect-oxlint'

import {
  indexReferences,
  isIdentifierReference,
  resolveFoldkitApiPath,
  resolvedVariable,
} from '../guards.ts'

type LazyFactoryName = 'createLazy' | 'createKeyedLazy'

const VIEW_ARGUMENT_INDEX_BY_FACTORY: Readonly<
  Record<LazyFactoryName, number>
> = {
  createLazy: 0,
  createKeyedLazy: 1,
}

const isLazyFactoryName = (name: string): name is LazyFactoryName =>
  name in VIEW_ARGUMENT_INDEX_BY_FACTORY

type WrapperExpression =
  | ESTree.ChainExpression
  | ESTree.ParenthesizedExpression
  | ESTree.TSAsExpression
  | ESTree.TSInstantiationExpression
  | ESTree.TSNonNullExpression
  | ESTree.TSSatisfiesExpression
  | ESTree.TSTypeAssertion

const WRAPPER_EXPRESSION_TYPES: ReadonlyArray<string> = [
  'ChainExpression',
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSInstantiationExpression',
  'TSNonNullExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
]

const isWrapperExpression = (node: ESTree.Node): node is WrapperExpression =>
  WRAPPER_EXPRESSION_TYPES.includes(node.type)

const unwrapExpression = (node: ESTree.Node): ESTree.Node =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

const isProgram = (node: ESTree.Node): node is ESTree.Program =>
  node.type === 'Program'

const isEstreeNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string'

const isFunctionLikeNode = (
  node: ESTree.Node,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  node.type === 'ArrowFunctionExpression' ||
  node.type === 'FunctionExpression' ||
  node.type === 'FunctionDeclaration'

const childValuesOf = (node: ESTree.Node): ReadonlyArray<unknown> => {
  const entries: ReadonlyArray<readonly [string, unknown]> =
    Object.entries(node)
  return pipe(
    entries,
    Array.flatMap(([key, value]) => (key === 'parent' ? [] : [value])),
  )
}

type LazyFactoryCall = Readonly<{
  call: ESTree.CallExpression
  factoryName: LazyFactoryName
}>

const matchLazyFactoryCall = (
  node: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<LazyFactoryCall> => {
  const unwrapped = unwrapExpression(node)
  if (unwrapped.type !== 'CallExpression') {
    return Option.none()
  }
  const callee = unwrapExpression(unwrapped.callee)
  if (references === undefined) {
    return callee.type === 'Identifier' && isLazyFactoryName(callee.name)
      ? Option.some({ call: unwrapped, factoryName: callee.name })
      : Option.none()
  }

  return Option.flatMap(resolveFoldkitApiPath(references, callee), path => {
    const [namespace, factoryName, extraMember] = path

    return namespace === 'Html' &&
      factoryName !== undefined &&
      isLazyFactoryName(factoryName) &&
      extraMember === undefined
      ? Option.some({ call: unwrapped, factoryName })
      : Option.none()
  })
}

const declarationOf = (
  statement: ESTree.Node,
): Option.Option<ESTree.VariableDeclaration> => {
  if (statement.type === 'VariableDeclaration') {
    return Option.some(statement)
  }
  if (
    statement.type === 'ExportNamedDeclaration' &&
    statement.declaration !== null &&
    statement.declaration.type === 'VariableDeclaration'
  ) {
    return Option.some(statement.declaration)
  }
  return Option.none()
}

type RegisteredSlot = Readonly<{
  slotName: string
  variable: Variable | undefined
  viewArgumentIndex: number
  initializerCall: ESTree.CallExpression
}>

const registeredSlotsOf = (
  program: ESTree.Program,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  scopeManager: ScopeManager | undefined,
): ReadonlyArray<RegisteredSlot> =>
  pipe(
    program.body,
    Array.flatMap(statement =>
      pipe(
        declarationOf(statement),
        Option.filter(declaration => declaration.kind === 'const'),
        Option.match({
          onNone: () => [],
          onSome: declaration => declaration.declarations,
        }),
      ),
    ),
    Array.flatMap(declarator => {
      if (declarator.id.type !== 'Identifier' || declarator.init === null) {
        return []
      }
      const slotName = declarator.id.name
      return pipe(
        matchLazyFactoryCall(declarator.init, references),
        Option.match({
          onNone: () => [],
          onSome: factoryCall => [
            {
              slotName,
              variable: scopeManager
                ?.getDeclaredVariables(declarator)
                .find(variable => variable.name === slotName),
              viewArgumentIndex:
                VIEW_ARGUMENT_INDEX_BY_FACTORY[factoryCall.factoryName],
              initializerCall: factoryCall.call,
            },
          ],
        }),
      )
    }),
  )

const parameterNames = (
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlyArray<string> =>
  pipe(
    functionNode.params,
    Array.flatMap(parameter =>
      parameter.type === 'Identifier' ? [parameter.name] : [],
    ),
  )

const ownFunctionName = (
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlyArray<string> =>
  functionNode.type === 'FunctionDeclaration' && functionNode.id !== null
    ? [functionNode.id.name]
    : []

const bodyBindingNames = (value: unknown): ReadonlyArray<string> => {
  if (Array.isArray(value)) {
    return pipe(
      value,
      Array.flatMap(element => bodyBindingNames(element)),
    )
  }
  if (!isEstreeNode(value)) {
    return []
  }
  if (value.type === 'FunctionDeclaration') {
    return value.id !== null ? [value.id.name] : []
  }
  if (
    value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression'
  ) {
    return []
  }
  const ownBinding =
    value.type === 'VariableDeclarator' && value.id.type === 'Identifier'
      ? [value.id.name]
      : []
  const childBindings = pipe(
    childValuesOf(value),
    Array.flatMap(child => bodyBindingNames(child)),
  )
  return [...ownBinding, ...childBindings]
}

const functionBindingNames = (
  functionNode: ESTree.ArrowFunctionExpression | ESTree.Function,
): ReadonlySet<string> =>
  new Set([
    ...parameterNames(functionNode),
    ...ownFunctionName(functionNode),
    ...bodyBindingNames(functionNode.body),
  ])

const isFunctionScopedName = (
  name: string,
  functionScopes: ReadonlyArray<ReadonlySet<string>>,
): boolean => functionScopes.some(scope => scope.has(name))

const isNestedInFunctionScope = (scope: Variable['scope']): boolean =>
  scope.type === 'function' ||
  (scope.upper !== null && isNestedInFunctionScope(scope.upper))

const isFunctionScopedView = (
  identifier: ESTree.IdentifierReference,
  context: AnalysisContext,
): boolean =>
  context.references === undefined
    ? isFunctionScopedName(identifier.name, context.functionScopes)
    : Option.exists(
        resolvedVariable(context.references, identifier),
        variable => isNestedInFunctionScope(variable.scope),
      )

const MISPLACED_CREATION_MESSAGE =
  '`createLazy()` and `createKeyedLazy()` must be assigned directly to a module-scope `const`. A slot recreated inside a function starts with a cold cache on every call, so the memoization never hits.'

const inlineViewFunctionMessage = (slotName: string): string =>
  `Lazy slot \`${slotName}\` is called with an inline view function. An inline function is a new reference on every render, so the cache never hits. Define the view function at module scope and pass its identifier.`

const functionScopedViewMessage = (
  slotName: string,
  viewName: string,
): string =>
  `Lazy slot \`${slotName}\` is called with \`${viewName}\`, which is bound inside an enclosing function. Function-scoped view functions get a fresh identity per render, so the cache never hits. Move \`${viewName}\` to module scope.`

type Offense = Readonly<{
  node: ESTree.Node
  message: string
}>

type AnalysisContext = Readonly<{
  slotsByName: ReadonlyMap<string, RegisteredSlot>
  registeredInitializers: ReadonlySet<ESTree.CallExpression>
  functionScopes: ReadonlyArray<ReadonlySet<string>>
  references: WeakMap<ESTree.Node, Reference> | undefined
}>

const misplacedCreationOffenses = (
  node: ESTree.CallExpression,
  context: AnalysisContext,
): ReadonlyArray<Offense> => {
  if (Option.isNone(matchLazyFactoryCall(node, context.references))) {
    return []
  }
  if (context.registeredInitializers.has(node)) {
    return []
  }
  return [{ node, message: MISPLACED_CREATION_MESSAGE }]
}

const unstableViewOffenses = (
  node: ESTree.CallExpression,
  context: AnalysisContext,
): ReadonlyArray<Offense> => {
  const callee = unwrapExpression(node.callee)
  if (!isIdentifierReference(callee)) {
    return []
  }
  const maybeSlot = Option.fromNullishOr(context.slotsByName.get(callee.name))
  if (Option.isNone(maybeSlot)) {
    return []
  }
  const { value: slot } = maybeSlot
  if (
    context.references !== undefined &&
    (slot.variable === undefined ||
      !Option.exists(
        resolvedVariable(context.references, callee),
        variable => variable === slot.variable,
      ))
  ) {
    return []
  }
  const maybeViewArgument = Array.get(node.arguments, slot.viewArgumentIndex)
  if (Option.isNone(maybeViewArgument)) {
    return []
  }
  const { value: viewArgument } = maybeViewArgument
  if (viewArgument.type === 'SpreadElement') {
    return []
  }
  const unwrappedViewArgument = unwrapExpression(viewArgument)
  if (isFunctionLikeNode(unwrappedViewArgument)) {
    return [
      { node: viewArgument, message: inlineViewFunctionMessage(slot.slotName) },
    ]
  }
  if (
    isIdentifierReference(unwrappedViewArgument) &&
    isFunctionScopedView(unwrappedViewArgument, context)
  ) {
    return [
      {
        node: viewArgument,
        message: functionScopedViewMessage(
          slot.slotName,
          unwrappedViewArgument.name,
        ),
      },
    ]
  }
  return []
}

const offensesAtNode = (
  node: ESTree.Node,
  context: AnalysisContext,
): ReadonlyArray<Offense> => {
  if (node.type !== 'CallExpression') {
    return []
  }
  return [
    ...misplacedCreationOffenses(node, context),
    ...unstableViewOffenses(node, context),
  ]
}

const collectOffenses = (
  value: unknown,
  context: AnalysisContext,
): ReadonlyArray<Offense> => {
  if (Array.isArray(value)) {
    return pipe(
      value,
      Array.flatMap(element => collectOffenses(element, context)),
    )
  }
  if (!isEstreeNode(value)) {
    return []
  }
  const ownOffenses = offensesAtNode(value, context)
  const childContext = isFunctionLikeNode(value)
    ? {
        ...context,
        functionScopes: [
          ...context.functionScopes,
          functionBindingNames(value),
        ],
      }
    : context
  const childOffenses = pipe(
    childValuesOf(value),
    Array.flatMap(child => collectOffenses(child, childContext)),
  )
  return [...ownOffenses, ...childOffenses]
}

/**
 * Requires `createLazy` and `createKeyedLazy` slots to be direct
 * module-scope `const` initializers, and requires the view function passed
 * at slot call sites to be a stable module-scope reference.
 */
export const lazyViewStableReferences = Rule.define({
  name: 'lazy-view-stable-references',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep lazy slots and their view functions referentially stable so the lazy cache can hit.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)
    return {
      'Program:exit': (node: ESTree.Node) => {
        if (!isProgram(node)) {
          return Effect.void
        }
        const registeredSlots = registeredSlotsOf(
          node,
          references,
          ctx.sourceCode.scopeManager,
        )
        const slotsByName = new Map(
          Array.map(
            registeredSlots,
            (slot): readonly [string, RegisteredSlot] => [slot.slotName, slot],
          ),
        )
        const registeredInitializers = new Set(
          Array.map(registeredSlots, slot => slot.initializerCall),
        )
        const offenses = collectOffenses(node, {
          slotsByName,
          registeredInitializers,
          functionScopes: [],
          references,
        })
        return Effect.forEach(
          offenses,
          offense => ctx.report(Diagnostic.make(offense)),
          { discard: true },
        )
      },
    }
  },
})
