import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const SCHEMA_ALIASES: ReadonlyArray<string> = ['Schema', 'S']
const NULLABLE_MEMBERS: ReadonlyArray<string> = ['NullOr', 'Null', 'optional']

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

// A `Schema.<name>` / `S.<name>` member access.
const isSchemaMember = (
  node: ESTree.Expression | ESTree.PrivateIdentifier,
  members: ReadonlyArray<string>,
): boolean =>
  node.type === 'MemberExpression' &&
  !node.computed &&
  node.object.type === 'Identifier' &&
  SCHEMA_ALIASES.includes(node.object.name) &&
  node.property.type === 'Identifier' &&
  members.includes(node.property.name)

// A `Schema.Struct` / `S.Struct` call.
const isSchemaStructCall = (
  node: ESTree.Expression,
): node is ESTree.CallExpression =>
  node.type === 'CallExpression' && isSchemaMember(node.callee, ['Struct'])

// A nullable-modeling value: `Schema.NullOr(...)`, `Schema.optional(...)`
// (call forms) or a bare `Schema.Null` member.
const isNullableValue = (value: ESTree.Expression): boolean =>
  (value.type === 'CallExpression' &&
    isSchemaMember(value.callee, NULLABLE_MEMBERS)) ||
  isSchemaMember(value, NULLABLE_MEMBERS)

const NULLABLE_MESSAGE =
  'Model absence uses `Schema.Option(...)`, never `Schema.NullOr`/`Schema.Null`/`Schema.optional`. Options are explicit about presence and thread through the update layer without null checks.'

/**
 * Flags `Schema.NullOr`/`Schema.Null`/`Schema.optional` fields inside the
 * `Model` schema, where absence must be modeled with `Schema.Option(...)`. The
 * rule is gated to the `const Model = Schema.Struct({...})` binding so wire/API
 * schemas that legitimately use null are left alone.
 */
export const preferOptionOverNullableInModel = Rule.define({
  name: 'prefer-option-over-nullable-in-model',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Model absence with Schema.Option instead of Schema.NullOr / Schema.Null / Schema.optional.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          node.id.type !== 'Identifier' ||
          node.id.name !== 'Model' ||
          node.init === null ||
          node.init === undefined ||
          !isSchemaStructCall(node.init)
        ) {
          return Effect.void
        }
        const [fields] = node.init.arguments
        if (fields === undefined || fields.type !== 'ObjectExpression') {
          return Effect.void
        }
        return Effect.forEach(
          fields.properties,
          property => {
            if (
              property.type !== 'Property' ||
              !isNullableValue(property.value)
            ) {
              return Effect.void
            }
            return ctx.report(
              Diagnostic.make({
                node: property.value,
                message: NULLABLE_MESSAGE,
              }),
            )
          },
          { discard: true },
        )
      },
    }
  },
})
