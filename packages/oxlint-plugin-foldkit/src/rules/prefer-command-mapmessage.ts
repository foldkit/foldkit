import { Array, Effect, Option } from 'effect'
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
  isArrowFunction,
  isCallExpression,
  resolveFoldkitApiPath,
  resolveImportedPath,
  staticMemberPath,
} from '../guards.ts'

const PASCAL_CASE_PATTERN = /^[A-Z]/

const isBlockStatement = (node: unknown): node is ESTree.BlockStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'BlockStatement'

const normalizedEffectPath = (
  references: WeakMap<ESTree.Node, Reference>,
  node: unknown,
): Option.Option<ReadonlyArray<string>> =>
  Option.flatMap(resolveImportedPath(references, node), path => {
    if (path.source === 'effect') {
      return Option.some(path.members)
    }
    if (path.source === 'effect/Effect') {
      return Option.some(['Effect', ...path.members])
    }
    return Option.none()
  })

const isEffectMapCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references === undefined
    ? AST.isCallOf(node, 'Effect', 'map')
    : Option.exists(normalizedEffectPath(references, node.callee), path => {
        const [namespace, member, extraMember] = path
        return (
          namespace === 'Effect' &&
          member === 'map' &&
          extraMember === undefined
        )
      })

const isCommandMapEffectCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references === undefined
    ? AST.isCallOf(node, 'Command', 'mapEffect')
    : Option.exists(resolveFoldkitApiPath(references, node.callee), path => {
        const [namespace, member, extraMember] = path
        return (
          namespace === 'Command' &&
          member === 'mapEffect' &&
          extraMember === undefined
        )
      })

const isMessageConstructorReference = (node: unknown): boolean => {
  const maybePath = staticMemberPath(node)
  if (Option.isNone(maybePath)) {
    return false
  }

  const path = [maybePath.value.root.name, ...maybePath.value.members]
  const maybeConstructorName = Array.last(path)
  if (
    Option.isNone(maybeConstructorName) ||
    !PASCAL_CASE_PATTERN.test(maybeConstructorName.value)
  ) {
    return false
  }

  const maybeOwnerName = Array.last(Array.dropRight(path, 1))
  return Option.exists(maybeOwnerName, ownerName =>
    ownerName.endsWith('Message'),
  )
}

const isMessageConstructorCall = (node: unknown): boolean =>
  isCallExpression(node) && isMessageConstructorReference(node.callee)

const isMessageWrappingArrow = (node: unknown): boolean => {
  if (!isArrowFunction(node)) {
    return false
  }
  if (!isBlockStatement(node.body)) {
    return isMessageConstructorCall(node.body)
  }
  return node.body.body.some(
    statement =>
      statement.type === 'ReturnStatement' &&
      isMessageConstructorCall(statement.argument),
  )
}

const isMessageMapper = (node: unknown): boolean =>
  isMessageConstructorReference(node) || isMessageWrappingArrow(node)

const isEffectMapWrappingMessage = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isCallExpression(node) || !isEffectMapCall(node, references)) {
    return false
  }
  const maybeMapper = Array.last(node.arguments)
  return Option.exists(maybeMapper, isMessageMapper)
}

const containsEffectMapWrappingMessage = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
  visited: WeakSet<object>,
): boolean => {
  if (typeof node !== 'object' || node === null || visited.has(node)) {
    return false
  }

  visited.add(node)
  if (isEffectMapWrappingMessage(node, references)) {
    return true
  }

  return Object.entries(node).some(
    ([key, value]) =>
      key !== 'parent' &&
      (Array.isArray(value)
        ? value.some(element =>
            containsEffectMapWrappingMessage(element, references, visited),
          )
        : containsEffectMapWrappingMessage(value, references, visited)),
  )
}

const MAP_EFFECT_MESSAGE_WRAP_MESSAGE =
  'Do not lift a Command result Message through Command.mapEffect. Mapping the Effect dispatches correctly in production but records nothing on the message-mapping chain, so Story and Scene resolve see the raw child Message. Lift with Command.mapMessage or Command.mapMessages, which record the lift.'

/**
 * Forbids lifting a Command's result Message through Command.mapEffect via an
 * Effect.map that returns a Message constructor call. Manual wrapping fuses
 * into the Effect but records nothing on the message-mapping chain that Story
 * and Scene resolve replay. Use Command.mapMessage or Command.mapMessages.
 */
export const preferCommandMapmessage = Rule.define({
  name: 'prefer-command-mapmessage',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Lift a Command result Message with Command.mapMessage or Command.mapMessages so Story and Scene resolve can recover it.',
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
          !isCommandMapEffectCall(node, references)
        ) {
          return Effect.void
        }

        const maybeTransform = Array.last(node.arguments)
        if (
          !Option.exists(maybeTransform, transform =>
            containsEffectMapWrappingMessage(
              transform,
              references,
              new WeakSet(),
            ),
          )
        ) {
          return Effect.void
        }

        return ctx.report(
          Diagnostic.make({ node, message: MAP_EFFECT_MESSAGE_WRAP_MESSAGE }),
        )
      },
    }
  },
})
