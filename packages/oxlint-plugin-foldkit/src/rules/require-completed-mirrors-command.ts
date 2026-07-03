import { Match, pipe } from 'effect'
import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { AST, Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashSet from 'effect/HashSet'
import * as Option from 'effect/Option'
import * as P from 'effect/Predicate'
import * as Result from 'effect/Result'
import * as Schema from 'effect/Schema'

const CompletedTag = Schema.String.check(
  Schema.isPattern(/^Completed[A-Z]/, {
    identifier: 'CompletedTag',
    title: 'Completed-prefixed Message Tag',
    description:
      'A Message tag of the form `Completed<Action>` where `<Action>` begins with an uppercase letter.',
  }),
)
const isCompletedTag = Schema.is(CompletedTag)

interface Mention {
  readonly kind: 'command' | 'completed'
  readonly action: string
  readonly node: ESTree.CallExpression
}

const stringLiteralValue = (arg: ESTree.Argument): Option.Option<string> =>
  arg.type === 'Literal' && P.isString(arg.value)
    ? Option.some(arg.value)
    : Option.none()

const stringLiteralArg = (
  call: ESTree.CallExpression,
): Option.Option<string> => {
  const arg = call.arguments[0]
  return arg === undefined ? Option.none() : stringLiteralValue(arg)
}

const extractMention = (node: ESTree.Node): Option.Option<Mention> => {
  if (node.type !== 'CallExpression') return Option.none()
  const call = node

  if (AST.isCallOf(call, 'Command', 'define')) {
    return pipe(
      stringLiteralArg(call),
      Option.map(action => ({
        kind: 'command' as const,
        action,
        node: call,
      })),
    )
  }

  if (call.callee.type === 'Identifier' && call.callee.name === 'm') {
    return pipe(
      stringLiteralArg(call),
      Option.filter(isCompletedTag),
      Option.map(tag => ({
        kind: 'completed' as const,
        action: tag.slice('Completed'.length),
        node: call,
      })),
    )
  }

  return Option.none()
}

interface Partitioned {
  readonly commandActions: HashSet.HashSet<string>
  readonly completed: ReadonlyArray<{
    readonly action: string
    readonly node: ESTree.CallExpression
  }>
}

const partitionMentions = (items: ReadonlyArray<Mention>): Partitioned => ({
  commandActions: pipe(
    items,
    Arr.filterMap(i =>
      i.kind === 'command' ? Result.succeed(i.action) : Result.failVoid,
    ),
    HashSet.fromIterable,
  ),
  completed: pipe(
    items,
    Arr.filterMap(i =>
      i.kind === 'completed'
        ? Result.succeed({ action: i.action, node: i.node })
        : Result.failVoid,
    ),
  ),
})

const rule: CreateRule = Rule.define({
  name: 'require-completed-mirrors-command',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      '`m("Completed<X>")` Messages must mirror a `Command.define("<X>", ...)` in the same file — verb-first, not noun-first (FK-1)',
  }),
  create: function* () {
    const ctx = yield* RuleContext

    return yield* Visitor.accumulate<Mention>(
      'CallExpression',
      extractMention,
      items => {
        const { commandActions, completed } = partitionMentions(items)

        // Only flag when the file defines at least one Command —
        // otherwise we can't make a confident judgment.
        return Match.value(HashSet.size(commandActions)).pipe(
          Match.when(0, () => Effect.void),
          Match.orElse(() =>
            Effect.forEach(
              completed,
              ({ action, node }) =>
                HashSet.has(commandActions, action)
                  ? Effect.void
                  : ctx.report(
                      Diagnostic.make({
                        node,
                        message: `\`Completed${action}\` does not mirror any \`Command.define(...)\` in this file. \`Completed*\` Messages must repeat the Command name verb-first (e.g. Command \`FocusInput\` → Message \`CompletedFocusInput\`, not \`CompletedInputFocus\`). (FK-1)`,
                      }),
                    ),
              { concurrency: 1, discard: true },
            ),
          ),
        )
      },
    )
  },
})

export default rule
