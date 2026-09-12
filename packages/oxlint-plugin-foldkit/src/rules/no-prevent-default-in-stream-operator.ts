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
  isIdentifier,
  isIdentifierReference,
  isMemberExpression,
  isVariableDeclarator,
  resolveImportedPath,
  resolvedVariable,
  staticMemberPath,
} from '../guards.ts'

const STREAM_OPERATOR_NAMES = [
  'map',
  'mapEffect',
  'filterMap',
  'filterMapEffect',
  'filter',
  'filterEffect',
  'tap',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFunctionNode = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  isRecord(node) &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration')

const isPreventDefaultCall = (value: unknown): value is ESTree.CallExpression =>
  isCallExpression(value) &&
  isMemberExpression(value.callee) &&
  value.callee.computed !== true &&
  isIdentifier(value.callee.property, 'preventDefault')

const preventDefaultCalls = (
  value: unknown,
): ReadonlyArray<ESTree.CallExpression> => {
  if (!isRecord(value)) {
    return []
  }
  const nested = pipe(
    Object.entries(value),
    Array.filter(([key]) => key !== 'parent'),
    Array.flatMap(([, child]) => preventDefaultCalls(child)),
  )
  return isPreventDefaultCall(value) ? [value, ...nested] : nested
}

const streamOperatorName = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  if (
    node.callee.type !== 'MemberExpression' ||
    node.callee.computed === true ||
    !isIdentifier(node.callee.property) ||
    !STREAM_OPERATOR_NAMES.includes(node.callee.property.name)
  ) {
    return Option.none()
  }

  if (references === undefined) {
    return AST.isMember(node.callee, 'Stream', STREAM_OPERATOR_NAMES)
      ? Option.some(node.callee.property.name)
      : Option.none()
  }

  const maybeImportedPath = resolveImportedPath(references, node.callee.object)
  if (
    Option.isSome(maybeImportedPath) &&
    !(
      (maybeImportedPath.value.source === 'effect' &&
        Option.exists(
          Array.last(maybeImportedPath.value.members),
          member => member === 'Stream',
        )) ||
      maybeImportedPath.value.source === 'effect/Stream'
    )
  ) {
    return Option.none()
  }

  const maybeMemberPath = staticMemberPath(node.callee)
  if (
    Option.isNone(maybeImportedPath) &&
    Option.isSome(maybeMemberPath) &&
    references.has(maybeMemberPath.value.root)
  ) {
    return Option.none()
  }

  return Option.some(node.callee.property.name)
}

const referencedFunction = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.ArrowFunctionExpression | ESTree.Function> => {
  if (isFunctionNode(node)) {
    return Option.some(node)
  }
  if (references === undefined || !isIdentifierReference(node)) {
    return Option.none()
  }

  return pipe(
    resolvedVariable(references, node),
    Option.flatMap(variable =>
      Array.findFirst(variable.defs, definition => {
        if (definition.type === 'FunctionName') {
          return isFunctionNode(definition.node)
        }
        return (
          definition.type === 'Variable' &&
          isVariableDeclarator(definition.node) &&
          isFunctionNode(definition.node.init)
        )
      }),
    ),
    Option.flatMap(definition => {
      if (definition.type === 'FunctionName') {
        return isFunctionNode(definition.node)
          ? Option.some(definition.node)
          : Option.none()
      }
      return isVariableDeclarator(definition.node) &&
        isFunctionNode(definition.node.init)
        ? Option.some(definition.node.init)
        : Option.none()
    }),
  )
}

const diagnosticMessage = (operatorName: string): string =>
  `\`preventDefault()\` inside a \`Stream.${operatorName}\` callback does not reliably run inside the browser's event dispatch. For a DOM-event Stream, the default action may already have happened by the time the callback runs. Cancel the event inside the listener with \`Subscription.fromEventPreventDefault\`, which calls \`preventDefault()\` for every handled event before the native listener returns. If this callback does not handle a DOM event, suppress this rule with a disable comment.`

/**
 * Flags `event.preventDefault()` inside callbacks passed to Stream operators
 * (`Stream.map`, `Stream.mapEffect`, `Stream.filterMap`,
 * `Stream.filterMapEffect`, `Stream.filter`, `Stream.filterEffect`,
 * `Stream.tap`).
 * Those callbacks do not reliably run inside the browser's event dispatch.
 * For a DOM-event Stream, cancellation belongs inside the native listener,
 * which is where `Subscription.fromEventPreventDefault` runs its mapper.
 */
export const noPreventDefaultInStreamOperator = Rule.define({
  name: 'no-prevent-default-in-stream-operator',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow unreliable preventDefault calls inside Stream operator callbacks.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return Option.match(streamOperatorName(node, references), {
          onNone: () => Effect.void,
          onSome: operatorName => {
            const calls = pipe(
              node.arguments,
              Array.flatMap(argument =>
                Option.match(referencedFunction(argument, references), {
                  onNone: () => [],
                  onSome: functionNode => [functionNode],
                }),
              ),
              Array.flatMap(preventDefaultCalls),
            )
            return Effect.forEach(
              calls,
              call =>
                ctx.report(
                  Diagnostic.make({
                    node: call,
                    message: diagnosticMessage(operatorName),
                  }),
                ),
              { discard: true },
            )
          },
        })
      },
    }
  },
})
