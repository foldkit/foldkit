import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

// Interactive ARIA widget roles that @foldkit/ui already ships a Submodel for.
const WIDGET_ROLE_TO_SUBMODEL: Readonly<Record<string, string>> = {
  dialog: 'Ui.Dialog',
  menu: 'Ui.Menu',
  tab: 'Ui.Tabs',
  tablist: 'Ui.Tabs',
  listbox: 'Ui.Listbox',
  combobox: 'Ui.Combobox',
}

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

const isStringLiteral = (node: unknown): node is ESTree.StringLiteral =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'Literal' &&
  'value' in node &&
  typeof node.value === 'string'

const isCallExpression = (node: unknown): node is ESTree.CallExpression =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === 'CallExpression'

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

const widgetRoleMessage = (role: string, submodel: string): string =>
  `\`Role('${role}')\` hand-rolls the ${role} interactive widget. Its keyboard interaction, focus management, and ARIA state are non-trivial and easy to get wrong. Use the \`${submodel}\` Submodel from \`@foldkit/ui\` instead.`

// RULE

/**
 * Forbids hand-building interactive ARIA widgets via
 * `Role('dialog'|'menu'|'tab'|'tablist'|'listbox'|'combobox')`, steering to the
 * matching `@foldkit/ui` Submodel that already implements the widget's keyboard
 * and focus semantics correctly.
 */
export const noHandRolledAriaWidgetRoles = Rule.define({
  name: 'no-hand-rolled-aria-widget-roles',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Use the matching @foldkit/ui Submodel instead of a hand-rolled interactive ARIA widget Role.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (
          !isCallExpression(node) ||
          !calleeMatchesHelperName(node.callee, 'Role')
        ) {
          return Effect.void
        }
        const [firstArgument] = node.arguments
        if (!isStringLiteral(firstArgument)) {
          return Effect.void
        }
        const submodel = WIDGET_ROLE_TO_SUBMODEL[firstArgument.value]
        if (submodel === undefined) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: widgetRoleMessage(firstArgument.value, submodel),
          }),
        )
      },
    }
  },
})
