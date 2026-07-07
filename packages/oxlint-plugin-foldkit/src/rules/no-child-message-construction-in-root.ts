import { Effect, Option, pipe } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isCallExpression } from '../guards.ts'

const pascalIdentifierPattern = /^[A-Z][A-Za-z0-9]*$/

const childMessageConstructionMessage = (
  namespace: string,
  constructorName: string,
): string =>
  `Do not construct the child Message \`${namespace}.Message.${constructorName}(...)\` from outside the child. Have the child export a helper that produces or applies this Message, and route child output back through the parent's Got*Message wrapper.`

/**
 * Flags direct construction of a child Submodel Message variant from outside
 * the child, such as Chat.Message.ClickedOpen(...).
 */
export const noChildMessageConstructionInRoot = Rule.define({
  name: 'no-child-message-construction-in-root',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Construct child Submodel Messages through child-exported helpers instead of reaching into the child Message namespace.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const callee = node.callee
        if (callee.type !== 'MemberExpression') {
          return Effect.void
        }
        return pipe(
          AST.memberPath(callee),
          Option.match({
            onNone: () => Effect.void,
            onSome: path => {
              const [namespace, middle, constructorName, extraSegment] = path
              if (
                namespace === undefined ||
                middle !== 'Message' ||
                constructorName === undefined ||
                constructorName === 'Message' ||
                extraSegment !== undefined ||
                !pascalIdentifierPattern.test(namespace) ||
                !pascalIdentifierPattern.test(constructorName)
              ) {
                return Effect.void
              }
              return ctx.report(
                Diagnostic.make({
                  node,
                  message: childMessageConstructionMessage(
                    namespace,
                    constructorName,
                  ),
                }),
              )
            },
          }),
        )
      },
    }
  },
})
