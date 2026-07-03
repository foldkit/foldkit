import { Match, pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'
import * as Tuple from 'effect/Tuple'

const SucceededTag = Schema.String.check(
  Schema.isPattern(/^Succeeded[A-Z]/, {
    identifier: 'SucceededTag',
    title: 'Succeeded-prefixed Message Tag',
    description:
      'A Message tag of the form `Succeeded<Action>` where `<Action>` begins with an uppercase letter.',
  }),
)
const isSucceededTag = Schema.is(SucceededTag)

const FailedTag = Schema.String.check(
  Schema.isPattern(/^Failed[A-Z]/, {
    identifier: 'FailedTag',
    title: 'Failed-prefixed Message Tag',
    description:
      'A Message tag of the form `Failed<Action>` where `<Action>` begins with an uppercase letter.',
  }),
)
const isFailedTag = Schema.is(FailedTag)

const classifyTag = (
  tag: string,
): Option.Option<{
  readonly kind: 'succeeded' | 'failed'
  readonly action: string
}> =>
  Match.value(tag).pipe(
    Match.when(isSucceededTag, t =>
      Option.some({
        kind: 'succeeded' as const,
        action: t.slice('Succeeded'.length),
      }),
    ),
    Match.when(isFailedTag, t =>
      Option.some({
        kind: 'failed' as const,
        action: t.slice('Failed'.length),
      }),
    ),
    Match.orElse(() => Option.none()),
  )

interface MessageMention {
  readonly kind: 'succeeded' | 'failed'
  readonly action: string
  readonly node: ESTree.CallExpression
}

const stringLiteralValue = (arg: ESTree.Argument): Option.Option<string> =>
  arg.type === 'Literal' && P.isString(arg.value)
    ? Option.some(arg.value)
    : Option.none()

const extractMention = (node: ESTree.Node): Option.Option<MessageMention> => {
  if (node.type !== 'CallExpression') return Option.none()
  if (node.callee.type !== 'Identifier' || node.callee.name !== 'm') {
    return Option.none()
  }
  const arg = node.arguments[0]
  if (arg === undefined) return Option.none()
  return pipe(
    stringLiteralValue(arg),
    Option.flatMap(classifyTag),
    Option.map(({ kind, action }) => ({ kind, action, node })),
  )
}

const rule: CreateRule = Rule.define({
  name: 'require-succeeded-failed-pair',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Every `m("Succeeded<Action>")` requires a matching `m("Failed<Action>")` in the same file (FK-1)',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    return yield* Visitor.accumulate<MessageMention>(
      'CallExpression',
      extractMention,
      items => {
        const succeededByAction = pipe(
          items,
          Arr.filterMap(i =>
            i.kind === 'succeeded'
              ? Result.succeed(Tuple.make(i.action, i.node))
              : Result.failVoid,
          ),
          HashMap.fromIterable,
        )
        const failedActions = pipe(
          items,
          Arr.filterMap(i =>
            i.kind === 'failed' ? Result.succeed(i.action) : Result.failVoid,
          ),
          HashSet.fromIterable,
        )

        return Effect.forEach(
          HashMap.toEntries(succeededByAction),
          ([action, node]) =>
            HashSet.has(failedActions, action)
              ? Effect.void
              : ctx.report(
                  Diagnostic.make({
                    node,
                    message: `\`Succeeded${action}\` has no paired \`Failed${action}\` in this file. Every fallible Command needs both Success and Failure Messages. (FK-1)`,
                  }),
                ),
          { concurrency: 1, discard: true },
        )
      },
    )
  },
})

export default rule
