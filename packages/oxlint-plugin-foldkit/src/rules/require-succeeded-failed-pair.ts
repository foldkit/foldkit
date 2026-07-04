import { Array, Effect, Option, Result, pipe } from 'effect'
import {
  Diagnostic,
  type ESTree,
  Rule,
  RuleContext,
  Visitor,
} from 'effect-oxlint'

const SUCCEEDED_TAG = /^Succeeded[A-Z]/
const FAILED_TAG = /^Failed[A-Z]/
const SUCCEEDED_PREFIX = 'Succeeded'
const FAILED_PREFIX = 'Failed'

type Mention = Readonly<{
  kind: 'Succeeded' | 'Failed'
  action: string
  node: ESTree.CallExpression
}>

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
  if (!isCallExpression(node) || !isIdentifierNamed(node.callee, 'm')) {
    return Option.none()
  }
  const [firstArgument] = node.arguments
  if (!isStringLiteral(firstArgument)) {
    return Option.none()
  }
  const tag = firstArgument.value
  if (SUCCEEDED_TAG.test(tag)) {
    return Option.some({
      kind: 'Succeeded',
      action: tag.slice(SUCCEEDED_PREFIX.length),
      node,
    })
  }
  if (FAILED_TAG.test(tag)) {
    return Option.some({
      kind: 'Failed',
      action: tag.slice(FAILED_PREFIX.length),
      node,
    })
  }
  return Option.none()
}

const unpairedMessage = (action: string): string =>
  `Succeeded${action} has no matching Failed${action} in this file. When a Command's failure is meaningful, define the Succeeded and Failed Messages as a pair. If the Command cannot meaningfully fail, name the Message Completed${action} instead.`

/**
 * Requires every Succeeded* Message tag to have a matching Failed* tag in the
 * same file, since Succeeded* asserts that a fallible Command exists. A lone
 * Failed* stays legal.
 */
export const requireSucceededFailedPair = Rule.define({
  name: 'require-succeeded-failed-pair',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Define Succeeded* and Failed* Messages as a pair in the same file.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return yield* Visitor.accumulate(
      'CallExpression',
      classifyMention,
      mentions => {
        const failedActions = new Set(
          pipe(
            mentions,
            Array.filterMap(mention =>
              mention.kind === 'Failed'
                ? Result.succeed(mention.action)
                : Result.failVoid,
            ),
          ),
        )
        const unpairedMentions = pipe(
          mentions,
          Array.filter(mention => mention.kind === 'Succeeded'),
          Array.dedupeWith((left, right) => left.action === right.action),
          Array.filter(mention => !failedActions.has(mention.action)),
        )
        return Effect.forEach(
          unpairedMentions,
          mention =>
            ctx.report(
              Diagnostic.make({
                node: mention.node,
                message: unpairedMessage(mention.action),
              }),
            ),
          { discard: true },
        )
      },
    )
  },
})
