import { Array, Effect, Result, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const COMMAND_STRUCT_SHAPES: ReadonlyArray<ReadonlyArray<string>> = [
  ['name', 'effect'],
  ['name', 'args', 'effect'],
]

const isObjectExpression = (node: unknown): node is ESTree.ObjectExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ObjectExpression'

const isIdentifier = (
  node: unknown,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string'

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const staticKeys = (node: ESTree.ObjectExpression): ReadonlySet<string> =>
  new Set(
    pipe(
      node.properties,
      Array.filterMap(property => {
        if (property.type !== 'Property' || property.computed === true) {
          return Result.failVoid
        }
        if (isIdentifier(property.key)) {
          return Result.succeed(property.key.name)
        }
        if (isStringLiteral(property.key)) {
          return Result.succeed(property.key.value)
        }
        return Result.failVoid
      }),
    ),
  )

const hasSpreadElement = (node: ESTree.ObjectExpression): boolean =>
  node.properties.some(property => property.type === 'SpreadElement')

const matchesShape = (
  keys: ReadonlySet<string>,
  shape: ReadonlyArray<string>,
): boolean => keys.size === shape.length && shape.every(key => keys.has(key))

const isHandRolledCommandShape = (keys: ReadonlySet<string>): boolean =>
  COMMAND_STRUCT_SHAPES.some(shape => matchesShape(keys, shape))

const spreadRebuildMessage =
  'Do not rebuild a Command by spreading one and overriding effect. Use Command.mapEffect, Command.mapMessage, or Command.mapMessages so the Command keeps its name and args.'

const handRolledMessage =
  'Do not build Command structs by hand as { name, effect } or { name, args, effect }. Create Commands with Command.define so identity, args, and tracing metadata stay canonical.'

/**
 * Forbids object literals that rebuild the Command struct by hand, either
 * from scratch or by spreading an existing Command and overriding effect.
 */
export const noHandRolledCommandStruct = Rule.define({
  name: 'no-hand-rolled-command-struct',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Create Commands with Command.define and transform them with the Command.map helpers instead of hand-building Command structs.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      ObjectExpression: (node: ESTree.Node) => {
        if (!isObjectExpression(node)) {
          return Effect.void
        }
        const keys = staticKeys(node)
        if (hasSpreadElement(node) && keys.has('effect')) {
          return ctx.report(
            Diagnostic.make({ node, message: spreadRebuildMessage }),
          )
        }
        if (isHandRolledCommandShape(keys)) {
          return ctx.report(
            Diagnostic.make({ node, message: handRolledMessage }),
          )
        }
        return Effect.void
      },
    }
  },
})
