import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

const formControlHelperNames = ['input', 'select', 'textarea']

// GUARDS

const isIdentifier = (
  node: unknown,
  name?: string,
): node is Readonly<{ type: 'Identifier'; name: string }> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Identifier' &&
  'name' in node &&
  typeof node.name === 'string' &&
  (name === undefined || node.name === name)

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

const isArrayExpression = (node: unknown): node is ESTree.ArrayExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'ArrayExpression'

const isMemberExpression = (
  node: unknown,
): node is Readonly<{
  type: 'MemberExpression'
  object: unknown
  property: unknown
  computed?: boolean
}> =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'MemberExpression'

const calleeMatchesHelperName = (
  callee: unknown,
  helperName: string,
): boolean =>
  isIdentifier(callee, helperName) ||
  (isMemberExpression(callee) &&
    !callee.computed &&
    isIdentifier(callee.property, helperName))

const isFormControlCall = (value: unknown): boolean =>
  isCallExpression(value) &&
  formControlHelperNames.some(helperName =>
    calleeMatchesHelperName(value.callee, helperName),
  )

const containsFormControlCall = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.some(element => containsFormControlCall(element))
  }
  if (typeof value !== 'object' || value === null) {
    return false
  }
  if (isFormControlCall(value)) {
    return true
  }
  const fieldEntries = Object.entries(value)
  return fieldEntries.some(
    ([fieldName, fieldValue]) =>
      fieldName !== 'parent' && containsFormControlCall(fieldValue),
  )
}

// RULE

/**
 * Requires every label call with a statically visible attribute array to
 * carry a For(id) attribute or nest a form control, so the label associates
 * with an input for screen readers and click-to-focus.
 */
export const labelRequiresFor = Rule.define({
  name: 'label-requires-for',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Associate every label with a control via a For(id) attribute or a nested form control.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !calleeMatchesHelperName(node.callee, 'label')
        ) {
          return Effect.void
        }
        const [attributesArgument] = node.arguments
        if (!isArrayExpression(attributesArgument)) {
          return Effect.void
        }
        const hasForAttribute = attributesArgument.elements.some(
          element =>
            isCallExpression(element) &&
            calleeMatchesHelperName(element.callee, 'For'),
        )
        if (hasForAttribute || containsFormControlCall(node.arguments)) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message:
              'This `label` has no `For(id)` attribute and no nested control, so it is not associated with any input. Screen readers cannot announce it and clicking it focuses nothing. Add `For(id)` here and `Id(id)` on the matching input, nest the control inside the label, or render the field with `Input.view` from `@foldkit/ui`, which wires the association for you.',
          }),
        )
      },
    }
  },
})
