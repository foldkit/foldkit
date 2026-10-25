// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Menu } from '@foldkit/ui'

type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'

const ActionMenu = Menu.create<Action>()

// Add a field to your Model for the Menu Block:
const Model = Schema.Struct({
  menu: ActionMenu.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const ActionMenuExampleDefinition = Block.makeDefinition('ActionMenuExample', {
  Model,
  Message,
})

const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

// At module scope, fold the OutMessage into your own Model. `Selected` carries
// the picked item directly (typed as `Action`), while `Closed` reports a close
// without selection. Each arm returns an Update.Step over the parent Model,
// which already has the next Menu Model written back. The parent Definition
// infers the factory-refined child contract from the completed Block:
const foldMenuOutMessage = ActionMenuExampleDefinition.makeOutMessageFold(
  ActionMenu,
  {
    // The child has emitted `Selected`. In this arm the parent can update
    // its own state or dispatch its own Commands, for example transition a
    // page, mutate domain state, or trigger a downstream Command.
    Selected: ActionMenuExampleDefinition.makeNoopStep,
    Closed: ActionMenuExampleDefinition.makeNoopStep,
  },
)

// The Binding wires the completed child Block into the parent: it runs ActionMenu.update,
// writes the next Menu Model back, routes generated delivery and Command
// results, and hands any OutMessage to the OutMessage fold.
const MenuBinding = ActionMenuExampleDefinition.makeBinding(ActionMenu, {
  field: 'menu',
  init: { contextToArgs: () => Tuple.make({ id: 'actions' }) },
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

const ActionMenuExampleComposition =
  ActionMenuExampleDefinition.makeComposition({
    bindings: [MenuBinding],
  })

// In your init function, initialize the Menu Block with a unique id:
const init = ActionMenuExampleComposition.makeInit(() => ({
  model: {
    // ...your other fields
  },
}))

const update = ActionMenuExampleComposition.makeUpdate({})

// Inside your view function, render the menu via the factory's view. The
// `buttonContent` below names the trigger. When the trigger is icon-only,
// give it a name with `ariaLabel`, or point `ariaLabelledBy` at a visible
// label element (target the trigger id with `buttonId('actions')` from `@foldkit/ui/menu` for a
// native `<label for>`). Either attribute is only emitted when provided, so
// the trigger never carries a dangling `aria-labelledby`.
const view = ActionMenuExampleComposition.makeView((model, h) =>
  h.block(
    MenuBinding.embedView({
      slotId: 'menu',
      model: model.menu,
      viewInputs: {
        // ariaLabel: 'Options',
        items: actions,
        buttonContent: h.span([], ['Options']),
        buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
        itemsClassName: 'rounded-lg border shadow-lg',
        itemToConfig: (action, { isActive }) => ({
          className: isActive ? 'bg-blue-100' : '',
          content: h.div([h.Class('px-3 py-2')], [action]),
        }),
        isItemDisabled: action => action === 'Archive',
        backdropClassName: 'fixed inset-0',
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
      },
    }),
  ),
)
