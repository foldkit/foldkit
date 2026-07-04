import { Array, Effect, Option, Result, pipe } from 'effect'
import {
  AST,
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

const COMPLETED_TAG = /^Completed[A-Z]/
const COMPLETED_PREFIX = 'Completed'

type CommandMention = Readonly<{ kind: 'Command'; action: string }>

type CompletedMention = Readonly<{
  kind: 'Completed'
  action: string
  node: ESTree.CallExpression
}>

type Mention = CommandMention | CompletedMention

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isIdentifierNamed = (
  node: unknown,
  name: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  node.name === name

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const classifyMention = (node: ESTree.Node): Option.Option<Mention> => {
  if (!isCallExpression(node)) {
    return Option.none()
  }
  if (AST.isCallOf(node, 'Command', 'define')) {
    const [firstArgument] = node.arguments
    return isStringLiteral(firstArgument)
      ? Option.some({ kind: 'Command', action: firstArgument.value })
      : Option.none()
  }
  if (!isIdentifierNamed(node.callee, 'm')) {
    return Option.none()
  }
  const [firstArgument] = node.arguments
  if (!isStringLiteral(firstArgument)) {
    return Option.none()
  }
  const tag = firstArgument.value
  return COMPLETED_TAG.test(tag)
    ? Option.some({
        kind: 'Completed',
        action: tag.slice(COMPLETED_PREFIX.length),
        node,
      })
    : Option.none()
}

const orphanMessage = (action: string): string =>
  `Completed${action} does not mirror any Command.define in this file. A Completed Message repeats its Command's name verb-first: Command FocusInput produces CompletedFocusInput, not CompletedInputFocus.`

/**
 * Requires every Completed* Message tag to mirror a Command.define name in
 * the same file, since Completed* Messages are fire-and-forget Command acks
 * that repeat the Command name verb-first.
 */
export const requireCompletedMirrorsCommand = Rule.define({
  name: 'require-completed-mirrors-command',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Name Completed* Messages after the Command.define they acknowledge, verb-first.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.accumulate(
      'CallExpression',
      classifyMention,
      mentions => {
        const commandActions = pipe(
          mentions,
          Array.filterMap(mention =>
            mention.kind === 'Command'
              ? Result.succeed(mention.action)
              : Result.failVoid,
          ),
        )
        if (Array.isArrayEmpty(commandActions)) {
          return Effect.void
        }
        const commandActionSet = new Set(commandActions)
        const orphanMentions = pipe(
          mentions,
          Array.filterMap(mention =>
            mention.kind === 'Completed' &&
            !commandActionSet.has(mention.action)
              ? Result.succeed(mention)
              : Result.failVoid,
          ),
        )
        return Effect.forEach(
          orphanMentions,
          mention =>
            ctx.report(
              Diagnostic.make({
                node: mention.node,
                message: orphanMessage(mention.action),
              }),
            ),
          { discard: true },
        )
      },
    )
  },
})
