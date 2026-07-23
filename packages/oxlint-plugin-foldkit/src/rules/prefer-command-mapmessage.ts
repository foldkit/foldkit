import { Effect } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isArrowFunction, isCallExpression, isIdentifier } from '../guards.ts'

const PASCAL_CASE_PATTERN = /^[A-Z]/

const isBlockStatement = (node: unknown): node is ESTree.BlockStatement =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'BlockStatement'

const isMessageConstructorCall = (node: unknown): boolean =>
  isCallExpression(node) &&
  isIdentifier(node.callee) &&
  PASCAL_CASE_PATTERN.test(node.callee.name)

const isMessageConstructorReference = (node: unknown): boolean =>
  isIdentifier(node) && PASCAL_CASE_PATTERN.test(node.name)

const isMessageWrappingArrow = (node: unknown): boolean => {
  if (!isArrowFunction(node)) {
    return false
  }
  if (isBlockStatement(node.body)) {
    return node.body.body.some(
      statement =>
        statement.type === 'ReturnStatement' &&
        isMessageConstructorCall(statement.argument),
    )
  }
  return isMessageConstructorCall(node.body)
}

const isEffectMapWrappingMessage = (node: unknown): boolean => {
  if (!isCallExpression(node) || !AST.isCallOf(node, 'Effect', 'map')) {
    return false
  }
  const [transform] = node.arguments
  return (
    isMessageConstructorReference(transform) ||
    isMessageWrappingArrow(transform)
  )
}

const MAP_EFFECT_MESSAGE_WRAP_MESSAGE =
  'Do not lift a Command result Message through Command.mapEffect. Effect.map(childMessage => Parent({ childMessage })) dispatches correctly in production but records nothing on the message-mapping chain, so Story/Scene resolve replays the chain (never the Effect) and sees the raw child Message. Lift with Command.mapMessage / Command.mapMessages, which record the lift.'

/**
 * Forbids lifting a Command's result Message through Command.mapEffect (via an
 * Effect.map that returns a Message constructor call). Manual wrapping fuses
 * into the Effect but records nothing on the message-mapping chain that
 * Story/Scene resolve replays, so the test sees the child's raw Message. Use
 * Command.mapMessage / Command.mapMessages, which record the lift.
 */
export const preferCommandMapmessage = Rule.define({
  name: 'prefer-command-mapmessage',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Lift a Command result Message with Command.mapMessage / mapMessages, not by mapping the Effect, so Story/Scene resolve can recover it.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !AST.isCallOf(node, 'Command', 'mapEffect')
        ) {
          return Effect.void
        }
        if (!node.arguments.some(isEffectMapWrappingMessage)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: MAP_EFFECT_MESSAGE_WRAP_MESSAGE }),
        )
      },
    }
  },
})
