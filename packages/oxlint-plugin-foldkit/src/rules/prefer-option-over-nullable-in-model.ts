import { Array, Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isVariableDeclarator,
} from '../guards.ts'

const SCHEMA_ALIASES: ReadonlyArray<string> = ['Schema', 'S']
const NULLABLE_MEMBERS: ReadonlyArray<string> = [
  'NullOr',
  'NullishOr',
  'UndefinedOr',
  'Null',
  'Undefined',
  'optional',
  'optionalKey',
]

const isSchemaMember = (
  node: unknown,
  members: ReadonlyArray<string>,
): boolean =>
  isMemberExpression(node) &&
  !node.computed &&
  isIdentifier(node.object) &&
  Array.contains(SCHEMA_ALIASES, node.object.name) &&
  isIdentifier(node.property) &&
  Array.contains(members, node.property.name)

const isSchemaStructCall = (node: unknown): node is ESTree.CallExpression =>
  isCallExpression(node) && isSchemaMember(node.callee, ['Struct'])

const isNullableValue = (value: unknown): boolean =>
  (isCallExpression(value) && isSchemaMember(value.callee, NULLABLE_MEMBERS)) ||
  isSchemaMember(value, NULLABLE_MEMBERS)

const NULLABLE_MESSAGE =
  'Model absence uses `Schema.Option(...)`, not a null/undefined/optional field (Schema.NullOr, Schema.NullishOr, Schema.UndefinedOr, Schema.Null, Schema.Undefined, Schema.optional, Schema.optionalKey). Options are explicit about presence and thread through the update layer without null checks.'

/**
 * Flags null, undefined, and optional field encodings inside the `Model` schema
 * (Schema.NullOr, Schema.NullishOr, Schema.UndefinedOr, Schema.Null,
 * Schema.Undefined, Schema.optional, Schema.optionalKey), where absence must be
 * modeled with `Schema.Option(...)`. The rule is gated to the
 * `const Model = Schema.Struct({...})` binding so wire/API schemas that
 * legitimately use null are left alone.
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
          !isIdentifier(node.id, 'Model') ||
          !isSchemaStructCall(node.init)
        ) {
          return Effect.void
        }
        const [fields] = node.init.arguments
        if (!isObjectExpression(fields)) {
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
