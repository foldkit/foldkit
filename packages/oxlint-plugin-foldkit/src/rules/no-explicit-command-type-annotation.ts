import type { CreateRule } from 'effect-oxlint'
import type { ESTree } from 'effect-oxlint'
import { Diagnostic, Rule, RuleContext, Visitor } from 'effect-oxlint'
import * as Effect from 'effect/Effect'

const isCommandTypeRefWithArguments = (node: ESTree.TSTypeReference): boolean =>
  node.typeName.type === 'Identifier' &&
  node.typeName.name === 'Command' &&
  node.typeArguments !== null

const rule: CreateRule = Rule.define({
  name: 'no-explicit-command-type-annotation',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Disallow explicit `Command<...>` type annotations on Command factories — let TypeScript infer (FK-2)',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return Visitor.on('TSTypeReference', node =>
      isCommandTypeRefWithArguments(node)
        ? ctx.report(
            Diagnostic.make({
              node,
              message:
                "Avoid explicit `Command<...>` type annotations. The Command identity (`Command.define(...)`) already constrains the Effect's return type at the type level — let TypeScript infer the rest. (FK-2)",
            }),
          )
        : Effect.void,
    )
  },
})

export default rule
