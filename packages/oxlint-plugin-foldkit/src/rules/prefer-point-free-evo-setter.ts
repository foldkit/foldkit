import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const isCallExpression = (node: ESTree.Node): node is ESTree.CallExpression =>
  node.type === 'CallExpression'

const isEvoCall = (node: ESTree.CallExpression): boolean =>
  node.callee.type === 'Identifier' && node.callee.name === 'evo'

const modelArgumentName = (node: ESTree.CallExpression): string | undefined => {
  const [modelArgument] = node.arguments
  return modelArgument !== undefined && modelArgument.type === 'Identifier'
    ? modelArgument.name
    : undefined
}

// A member read `<modelArg>.<key>`, written `model.key` or `model['key']`.
const readsModelField = (
  node: Readonly<Record<string, unknown>>,
  modelArg: string,
  key: string,
): boolean => {
  if (node.type !== 'MemberExpression') return false
  const object = node.object
  if (
    typeof object !== 'object' ||
    object === null ||
    (object as Record<string, unknown>).type !== 'Identifier' ||
    (object as Record<string, unknown>).name !== modelArg
  ) {
    return false
  }
  const property = node.property as Record<string, unknown>
  return node.computed === true
    ? property.type === 'Literal' && property.value === key
    : property.type === 'Identifier' && property.name === key
}

// Recursively scan an arrow body for any `<modelArg>.<key>` read.
const bodyReadsField = (
  value: unknown,
  modelArg: string,
  key: string,
): boolean => {
  if (typeof value !== 'object' || value === null) return false
  if (Array.isArray(value)) {
    return value.some(child => bodyReadsField(child, modelArg, key))
  }
  const record = value as Record<string, unknown>
  if (readsModelField(record, modelArg, key)) return true
  return Object.entries(record).some(([childKey, child]) =>
    childKey === 'parent' ? false : bodyReadsField(child, modelArg, key),
  )
}

const pointFreeMessage = (fieldName: string): string =>
  `The evo setter for \`${fieldName}\` wraps the transform in a zero-argument \`() => ...(model.${fieldName})\` thunk that only re-reads the field it sets. Let the evo setter receive the field and pass the transformer point-free: \`${fieldName}: transform\`.`

/**
 * Flags evo field setters that wrap a same-field transform in a zero-argument
 * arrow (`count: () => model.count + 1`). Foldkit evo setters receive the field
 * they set, so the transformer belongs point-free (`count: Number.increment`).
 */
export const preferPointFreeEvoSetter = Rule.define({
  name: 'prefer-point-free-evo-setter',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Pass an evo setter transformer point-free instead of wrapping a same-field read in a zero-argument arrow.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node) || !isEvoCall(node)) return Effect.void
        const modelArg = modelArgumentName(node)
        if (modelArg === undefined) return Effect.void
        const [, updates] = node.arguments
        if (updates === undefined || updates.type !== 'ObjectExpression') {
          return Effect.void
        }
        return Effect.forEach(
          updates.properties,
          property => {
            if (
              property.type !== 'Property' ||
              property.computed ||
              property.key.type !== 'Identifier' ||
              property.value.type !== 'ArrowFunctionExpression' ||
              property.value.params.length !== 0
            ) {
              return Effect.void
            }
            const key = property.key.name
            if (!bodyReadsField(property.value.body, modelArg, key)) {
              return Effect.void
            }
            return ctx.report(
              Diagnostic.make({ node: property, message: pointFreeMessage(key) }),
            )
          },
          { discard: true },
        )
      },
    }
  },
})
