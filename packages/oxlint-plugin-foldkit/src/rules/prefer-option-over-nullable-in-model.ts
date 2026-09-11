import { Array, Effect, Option } from 'effect'
import {
  Diagnostic,
  type ESTree,
  type Reference,
  Rule,
  RuleContext,
} from 'effect-oxlint'

import {
  indexReferences,
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isVariableDeclarator,
  resolveImportedPath,
  staticMemberName,
  staticMemberPath,
} from '../guards.ts'

const SCHEMA_ALIASES: ReadonlySet<string> = new Set(['Schema', 'S'])
const NULLABLE_MEMBERS: ReadonlySet<string> = new Set([
  'NullOr',
  'NullishOr',
  'UndefinedOr',
  'Null',
  'Undefined',
  'optional',
  'optionalKey',
])

const isNode = (node: unknown): node is ESTree.Node =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  typeof node.type === 'string'

const schemaMemberName = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<string> => {
  if (references === undefined) {
    return Option.flatMap(staticMemberPath(node), path => {
      const [member, extraMember] = path.members
      return SCHEMA_ALIASES.has(path.root.name) &&
        member !== undefined &&
        extraMember === undefined
        ? Option.some(member)
        : Option.none()
    })
  }

  return Option.flatMap(resolveImportedPath(references, node), path => {
    const [namespace, member, extraMember] = path.members
    if (
      path.source === 'effect' &&
      namespace === 'Schema' &&
      member !== undefined &&
      extraMember === undefined
    ) {
      return Option.some(member)
    }
    if (
      path.source === 'effect/Schema' &&
      namespace !== undefined &&
      member === undefined
    ) {
      return Option.some(namespace)
    }
    return Option.none()
  })
}

const isSchemaStructCall = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): node is ESTree.CallExpression =>
  isCallExpression(node) &&
  Option.contains(schemaMemberName(node.callee, references), 'Struct')

const nullableMember = (
  node: unknown,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> => {
  if (
    !isNode(node) ||
    !Option.exists(schemaMemberName(node, references), name =>
      NULLABLE_MEMBERS.has(name),
    )
  ) {
    return Option.none()
  }
  return Option.some(node)
}

const nullableFieldMember = (
  value: ESTree.Node,
  references: WeakMap<ESTree.Node, Reference> | undefined,
): Option.Option<ESTree.Node> => {
  const directMember = isCallExpression(value)
    ? nullableMember(value.callee, references)
    : nullableMember(value, references)
  if (Option.isSome(directMember)) {
    return directMember
  }
  if (
    !isCallExpression(value) ||
    !isMemberExpression(value.callee) ||
    !Option.contains(staticMemberName(value.callee), 'pipe')
  ) {
    return Option.none()
  }

  const baseMember = nullableFieldMember(value.callee.object, references)
  if (Option.isSome(baseMember)) {
    return baseMember
  }
  return Array.findFirst(value.arguments, argument => {
    const member = isCallExpression(argument)
      ? nullableMember(argument.callee, references)
      : nullableMember(argument, references)
    return Option.isSome(member) ? member : Option.none()
  })
}

const NULLABLE_MESSAGE =
  'Model absence uses Schema.Option, not a null, undefined, or optional field. Options make presence explicit and thread through update without null checks.'

/**
 * Flags null, undefined, and optional field encodings inside the Model schema,
 * where absence must be modeled with Schema.Option. The rule is gated to a
 * const Model = Schema.Struct({...}) binding so wire and API schemas that
 * legitimately use null are left alone.
 */
export const preferOptionOverNullableInModel = Rule.define({
  name: 'prefer-option-over-nullable-in-model',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Model absence with Schema.Option instead of nullable or optional fields.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const scopes = ctx.sourceCode.scopeManager?.scopes
    const references =
      scopes === undefined ? undefined : indexReferences(scopes)

    return {
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          !isVariableDeclarator(node) ||
          !isIdentifier(node.id, 'Model') ||
          !isSchemaStructCall(node.init, references)
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
            if (property.type !== 'Property') {
              return Effect.void
            }
            const maybeNullable = nullableFieldMember(
              property.value,
              references,
            )
            return Option.match(maybeNullable, {
              onNone: () => Effect.void,
              onSome: nullable =>
                ctx.report(
                  Diagnostic.make({
                    node: nullable,
                    message: NULLABLE_MESSAGE,
                  }),
                ),
            })
          },
          { discard: true },
        )
      },
    }
  },
})
