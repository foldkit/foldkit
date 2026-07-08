import { Array, Effect, Option, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isProgram,
} from '../guards.ts'

const factoryWrapperTypes: ReadonlyArray<string> = [
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSTypeAssertion',
  'TSNonNullExpression',
  'TSInstantiationExpression',
  'ChainExpression',
]

const singleSelectComponents: ReadonlyArray<string> = [
  'Combobox',
  'Listbox',
  'Menu',
  'Tabs',
]

const multiSelectComponents: ReadonlyArray<string> = ['Combobox', 'Listbox']

const isWrapperExpression = (
  node: unknown,
): node is Readonly<{ expression: unknown }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string' &&
  factoryWrapperTypes.includes(node.type) &&
  'expression' in node

const unwrapExpression = (node: unknown): unknown =>
  isWrapperExpression(node) ? unwrapExpression(node.expression) : node

const isVariableDeclaration = (
  node: unknown,
): node is ESTree.VariableDeclaration =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'VariableDeclaration'

const resolveMemberPath = (
  node: unknown,
): Option.Option<Array.NonEmptyReadonlyArray<string>> => {
  const unwrapped = unwrapExpression(node)
  if (isIdentifier(unwrapped)) {
    return Option.some(Array.of(unwrapped.name))
  }
  if (isMemberExpression(unwrapped) && !unwrapped.computed) {
    const property = unwrapExpression(unwrapped.property)
    if (!isIdentifier(property)) {
      return Option.none()
    }
    return pipe(
      resolveMemberPath(unwrapped.object),
      Option.map(Array.append(property.name)),
    )
  }
  return Option.none()
}

const isSelectionFactoryPath = (
  path: Array.NonEmptyReadonlyArray<string>,
): boolean => {
  const [first, second, third, fourth, fifth] = path
  if (fifth !== undefined) {
    return false
  }
  if (fourth !== undefined) {
    return (
      first === 'Ui' &&
      second !== undefined &&
      multiSelectComponents.includes(second) &&
      third === 'Multi' &&
      fourth === 'create'
    )
  }
  if (third !== undefined) {
    const isMultiForm =
      second === 'Multi' &&
      multiSelectComponents.includes(first) &&
      third === 'create'
    const isUiNamespaceForm =
      first === 'Ui' &&
      second !== undefined &&
      singleSelectComponents.includes(second) &&
      third === 'create'
    return isMultiForm || isUiNamespaceForm
  }
  return second === 'create' && singleSelectComponents.includes(first)
}

const selectionFactoryLabel = (
  call: ESTree.CallExpression,
): Option.Option<string> =>
  pipe(
    resolveMemberPath(call.callee),
    Option.filter(isSelectionFactoryPath),
    Option.map(Array.join('.')),
  )

type SelectionFactoryCall = Readonly<{
  call: ESTree.CallExpression
  label: string
}>

const selectionFactorySelfMatch = (
  value: unknown,
): ReadonlyArray<SelectionFactoryCall> => {
  if (!isCallExpression(value)) {
    return []
  }
  const call = value
  return pipe(
    selectionFactoryLabel(call),
    Option.match({
      onNone: () => [],
      onSome: label => [{ call, label }],
    }),
  )
}

const collectSelectionFactoryCalls = (
  value: unknown,
): ReadonlyArray<SelectionFactoryCall> => {
  if (typeof value !== 'object' || value === null) {
    return []
  }
  const childEntries = Object.entries(value)
  const childMatches = childEntries.flatMap(([key, child]) =>
    key === 'parent' ? [] : collectSelectionFactoryCalls(child),
  )
  return [...selectionFactorySelfMatch(value), ...childMatches]
}

const topLevelInitializerCalls = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.CallExpression> => {
  const statements = program.body
  return statements.flatMap(statement => {
    const declaration =
      statement.type === 'ExportNamedDeclaration'
        ? statement.declaration
        : statement
    if (!isVariableDeclaration(declaration)) {
      return []
    }
    const declarators = declaration.declarations
    return declarators.flatMap(declarator => {
      const initializer = unwrapExpression(declarator.init)
      return isCallExpression(initializer) ? [initializer] : []
    })
  })
}

const moduleScopeFactoryMessage = (label: string): string =>
  `Declare \`${label}(...)\` once as a module-scope variable initializer. A selection Submodel factory created inline or inside a function drifts from the update and view types built against it and gives the view an unstable identity.`

/**
 * Requires every Foldkit UI selection component factory call, such as
 * Listbox.create or Combobox.Multi.create, to be the direct initializer of a
 * module-scope variable.
 */
export const selectionSubmodelFactoryAtModuleScope = Rule.define({
  name: 'selection-submodel-factory-at-module-scope',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Create selection Submodel factories once as module-scope variable initializers.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.onExit('Program', (node: ESTree.Node) => {
      if (!isProgram(node)) {
        return Effect.void
      }
      const allowedCalls = topLevelInitializerCalls(node)
      const factoryCalls = collectSelectionFactoryCalls(node)
      const offendingCalls = factoryCalls.filter(
        factoryCall => !allowedCalls.includes(factoryCall.call),
      )
      return Effect.forEach(
        offendingCalls,
        factoryCall =>
          ctx.report(
            Diagnostic.make({
              node: factoryCall.call,
              message: moduleScopeFactoryMessage(factoryCall.label),
            }),
          ),
        { discard: true },
      )
    })
  },
})
