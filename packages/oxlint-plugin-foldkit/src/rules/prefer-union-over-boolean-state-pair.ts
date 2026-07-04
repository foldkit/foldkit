import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const SCHEMA_ALIASES: ReadonlyArray<string> = ['Schema', 'S']
const STATE_FLAG_KEY = /^(is|has)[A-Z]/

const isVariableDeclarator = (
  node: ESTree.Node,
): node is ESTree.VariableDeclarator => node.type === 'VariableDeclarator'

// A `Schema.<name>` / `S.<name>` member access.
const isSchemaMember = (
  node: ESTree.Expression | ESTree.PrivateIdentifier,
  member: string,
): boolean =>
  node.type === 'MemberExpression' &&
  !node.computed &&
  node.object.type === 'Identifier' &&
  SCHEMA_ALIASES.includes(node.object.name) &&
  node.property.type === 'Identifier' &&
  node.property.name === member

const isSchemaStructCall = (
  node: ESTree.Expression,
): node is ESTree.CallExpression =>
  node.type === 'CallExpression' && isSchemaMember(node.callee, 'Struct')

// A `Schema.Boolean` field whose key looks like a state flag (isX / hasX).
const isBooleanStateFlag = (property: ESTree.ObjectProperty): boolean =>
  !property.computed &&
  property.key.type === 'Identifier' &&
  STATE_FLAG_KEY.test(property.key.name) &&
  isSchemaMember(property.value, 'Boolean')

const UNION_MESSAGE =
  'This Model carries two or more sibling `is*`/`has*` boolean flags, which encode illegal states (e.g. isLoading && isError at once). Model the mutually exclusive states as a tagged `Schema.Union(...)` so only reachable states are representable.'

/**
 * Flags a `Model` schema carrying two or more sibling `Schema.Boolean` fields
 * whose keys match `is*`/`has*`. Such flag pairs make illegal combinations
 * representable; a tagged `Schema.Union` keeps the state space honest. Gated to
 * the `const Model = Schema.Struct({...})` binding.
 */
export const preferUnionOverBooleanStatePair = Rule.define({
  name: 'prefer-union-over-boolean-state-pair',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Model 2+ sibling is*/has* boolean flags as a tagged Schema.Union instead of independent booleans.',
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
        const flagCount = fields.properties.filter(
          property =>
            property.type === 'Property' && isBooleanStateFlag(property),
        ).length
        if (flagCount < 2) return Effect.void
        return ctx.report(
          Diagnostic.make({ node: node.init, message: UNION_MESSAGE }),
        )
      },
    }
  },
})
