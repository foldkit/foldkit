import { Array, Effect, Option } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const EMPTY_ABLE_ELEMENTS: ReadonlyArray<string> = [
  'article',
  'div',
  'p',
  'section',
  'span',
]

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isEmptyArrayLiteral = (node: ESTree.Node): boolean =>
  node.type === 'ArrayExpression' && Array.isArrayEmpty(node.elements)

type EmptyElementCallee = Readonly<{
  writtenCallee: string
  replacement: string
}>

const matchEmptyElementCallee = (
  callee: ESTree.Node,
): Option.Option<EmptyElementCallee> => {
  if (
    callee.type === 'Identifier' &&
    EMPTY_ABLE_ELEMENTS.includes(callee.name)
  ) {
    return Option.some({ writtenCallee: callee.name, replacement: 'empty' })
  }
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier' &&
    EMPTY_ABLE_ELEMENTS.includes(callee.property.name)
  ) {
    return Option.some({
      writtenCallee: `${callee.object.name}.${callee.property.name}`,
      replacement: `${callee.object.name}.empty`,
    })
  }
  return Option.none()
}

/**
 * Flags hyperscript element calls that render a completely empty element,
 * like `span([], [])`, and recommends the dedicated `empty` value instead.
 */
export const preferEmptyOverEmptyElement = Rule.define({
  name: 'prefer-empty-over-empty-element',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Render nothing with the dedicated empty value instead of an empty container element.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || node.arguments.length !== 2) {
          return Effect.void
        }
        const [attributesArgument, childrenArgument] = node.arguments
        if (
          attributesArgument === undefined ||
          childrenArgument === undefined ||
          !isEmptyArrayLiteral(attributesArgument) ||
          !isEmptyArrayLiteral(childrenArgument)
        ) {
          return Effect.void
        }
        return Option.match(matchEmptyElementCallee(node.callee), {
          onNone: () => Effect.void,
          onSome: ({ writtenCallee, replacement }) =>
            ctx.report(
              Diagnostic.make({
                node,
                message: `\`${writtenCallee}([], [])\` renders an empty element. Use \`${replacement}\` instead; it renders nothing.`,
              }),
            ),
        })
      },
    }
  },
})
