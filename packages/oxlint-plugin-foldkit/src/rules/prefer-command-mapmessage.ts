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
  isIdentifier,
  isVariableDeclarator,
  resolvedVariable,
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

const isMessageConstructorPath = (path: ReadonlyArray<string>): boolean => {
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

const isMessageConstructorReference = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
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
  if (references === undefined) {
    return isMessageConstructorPath(path)
  }

  const maybeImportedPath = resolveImportedPath(references, node)
  if (Option.isSome(maybeImportedPath)) {
    return isMessageConstructorPath(maybeImportedPath.value.members)
  }
  if (!isMessageConstructorPath(path)) {
    return false
  }

  return Option.exists(
    resolvedVariable(references, maybePath.value.root),
    variable =>
      variable.defs.some(definition => {
        if (
          definition.type !== 'Variable' ||
          !isVariableDeclarator(definition.node) ||
          !isCallExpression(definition.node.init)
        ) {
          return false
        }

        return Option.exists(
          resolveFoldkitApiPath(references, definition.node.init.callee),
          apiPath => {
            const [namespace, helperName, extraMember] = apiPath
            return (
              namespace === 'Message' &&
              helperName === 'defineMessageUnion' &&
              extraMember === undefined
            )
          },
        )
      }),
  )
}

const isMessageConstructorCall = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  isCallExpression(node) &&
  isMessageConstructorReference(node.callee, references)

const isMessageWrappingArrow = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isArrowFunction(node)) {
    return false
  }
  if (!isBlockStatement(node.body)) {
    return isMessageConstructorCall(node.body, references)
  }
  return node.body.body.some(
    statement =>
      statement.type === 'ReturnStatement' &&
      isMessageConstructorCall(statement.argument, references),
  )
}

const isMessageMapper = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  isMessageConstructorReference(node, references) ||
  isMessageWrappingArrow(node, references)

const isEffectMapWrappingMessage = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (!isCallExpression(node) || !isEffectMapCall(node, references)) {
    return false
  }
  const maybeMapper = Array.last(node.arguments)
  return Option.exists(maybeMapper, mapper =>
    isMessageMapper(mapper, references),
  )
}

const isPipeCall = (
  node: ESTree.CallExpression,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean =>
  references === undefined
    ? isIdentifier(node.callee, 'pipe')
    : Option.exists(resolveImportedPath(references, node.callee), path => {
        const [member, extraMember] = path.members
        return (
          path.source === 'effect' &&
          member === 'pipe' &&
          extraMember === undefined
        )
      })

const isPipeMethodCall = (node: ESTree.CallExpression): boolean =>
  Option.exists(staticMemberPath(node.callee), path => {
    const [member, extraMember] = path.members
    return member === 'pipe' && extraMember === undefined
  })

const returnedExpression = (node: unknown): Option.Option<unknown> => {
  if (!isArrowFunction(node)) {
    return Option.none()
  }
  if (!isBlockStatement(node.body)) {
    return Option.some(node.body)
  }

  const returnStatements = node.body.body.filter(
    statement => statement.type === 'ReturnStatement',
  )
  return Array.match(returnStatements, {
    onEmpty: () => Option.none(),
    onNonEmpty: ([statement, ...remainingStatements]) =>
      Array.isArrayEmpty(remainingStatements)
        ? Option.fromNullishOr(statement.argument)
        : Option.none(),
  })
}

const resultPathMapsMessage = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => {
  if (isEffectMapWrappingMessage(node, references)) {
    return true
  }

  const maybeReturnedExpression = returnedExpression(node)
  if (Option.isSome(maybeReturnedExpression)) {
    return resultPathMapsMessage(maybeReturnedExpression.value, references)
  }
  if (!isCallExpression(node)) {
    return false
  }
  if (isPipeCall(node, references)) {
    return node.arguments.some(argument =>
      resultPathMapsMessage(argument, references),
    )
  }
  if (!isPipeMethodCall(node)) {
    return false
  }

  const maybeCalleePath = staticMemberPath(node.callee)
  return (
    Option.exists(maybeCalleePath, path =>
      resultPathMapsMessage(path.root, references),
    ) ||
    node.arguments.some(argument => resultPathMapsMessage(argument, references))
  )
}

const transformMapsResultMessage = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): boolean => resultPathMapsMessage(node, references)

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
            transformMapsResultMessage(transform, references),
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
