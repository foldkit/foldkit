import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isIdentifier = (
  node: unknown,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression' &&
  'arguments' in node &&
  Array.isArray((node as { arguments: unknown }).arguments)

const isArrowFunction = (
  node: unknown,
): node is Readonly<{ type: 'ArrowFunctionExpression'; body: { type: string } }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrowFunctionExpression' &&
  'body' in node

// Foldkit view event handlers are the `h.On<Event>(...)` helpers
// (h.OnClick, h.OnInput, h.OnSubmit, h.OnKeyDown, ...).
const isEventHandlerCallee = (callee: unknown): boolean =>
  typeof callee === 'object' &&
  callee !== null &&
  'type' in callee &&
  callee.type === 'MemberExpression' &&
  'object' in callee &&
  isIdentifier(callee.object) &&
  callee.object.name === 'h' &&
  'property' in callee &&
  isIdentifier(callee.property) &&
  /^On[A-Z]/.test(callee.property.name)

// Bodies that carry a branch or computation belong in `update`, not the view.
const LOGIC_BODY_TYPES: ReadonlyArray<string> = [
  'BlockStatement',
  'ConditionalExpression',
  'LogicalExpression',
  'IfStatement',
  'SequenceExpression',
]

const LOGIC_IN_HANDLER_MESSAGE =
  'Event handlers must only name a Message: a bare constructor (h.OnClick(ClickedIncrement)) or a payload adapter (event => UpdatedEmail({ value: event.target.value })). This handler branches/computes in the view — move that decision into `update`, which owns how state changes.'

/**
 * Forbids decision logic inside a Foldkit event handler. A handler must name a
 * Message — a bare constructor reference or an arrow that just calls a Message
 * constructor. An arrow whose body branches (conditional/logical) or is a block
 * puts update logic in the view, so this flags those shapes.
 */
export const noLogicInEventHandlers = Rule.define({
  name: 'no-logic-in-event-handlers',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Keep decision logic out of view event handlers; a handler must only name a Message.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isEventHandlerCallee(node.callee)) {
          return Effect.void
        }
        const [firstArgument] = node.arguments
        if (
          !isArrowFunction(firstArgument) ||
          !LOGIC_BODY_TYPES.includes(firstArgument.body.type)
        ) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({ node, message: LOGIC_IN_HANDLER_MESSAGE }),
        )
      },
    }
  },
})
