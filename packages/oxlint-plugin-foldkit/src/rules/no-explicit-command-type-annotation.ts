import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isTSTypeReference = (node: unknown): node is ESTree.TSTypeReference =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'TSTypeReference'

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

const explicitAnnotationMessage =
  "Avoid explicit Command<...> type annotations. Command.define already pins the Effect's result Message type, so let TypeScript infer the rest."

/**
 * Forbids explicit Command<...> type annotations, since Command.define
 * already constrains the Effect's result Message type and the annotation
 * only drifts.
 */
export const noExplicitCommandTypeAnnotation = Rule.define({
  name: 'no-explicit-command-type-annotation',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Let TypeScript infer Command types instead of writing explicit Command<...> annotations.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      TSTypeReference: (node: ESTree.Node) => {
        if (
          !isTSTypeReference(node) ||
          !isIdentifierNamed(node.typeName, 'Command') ||
          node.typeArguments === null
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: explicitAnnotationMessage }),
        )
      },
    }
  },
})
