// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'
import { buttonId as ListboxButtonId } from '@foldkit/ui/listbox'

const Plan = Schema.Literals(['Free', 'Pro', 'Enterprise'])

// Declare a typed Listbox once at module scope. `view` and `update` are
// bound to `Plan`: `items` is typed as `ReadonlyArray<Plan>` and the
// OutMessage carries `value: Plan`.
const PlanListbox = Listbox.create<typeof Plan.Type>()

// Add a field to your Model for the Listbox Block, plus a field for
// the selected value your app actually cares about. Using the `Plan`
// Schema keeps the field literal-typed end to end:
const Model = Schema.Struct({
  maybePlan: Schema.Option(Plan),
  listbox: PlanListbox.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const PlanPickerDefinition = Block.makeDefinition('PlanPicker', {
  Model,
  Message,
})

// At module scope, fold the OutMessage into your own Model. When the user
// commits a selection it carries `Selected({ value })` where `value: Plan`.
// The arm returns an Update.Step over the parent Model, which already has the
// next Listbox Model written back. Passing the completed child Block preserves
// the factory's refined `Plan` payload without a repeated type argument:
const foldListboxOutMessage = PlanPickerDefinition.makeOutMessageFold(
  PlanListbox,
  {
    Selected: ({ value }) =>
      PlanPickerDefinition.makeFieldsStep(() => ({
        maybePlan: () => Option.some(value),
      })),
  },
)

// The Binding wires the completed child Block into the parent: it delegates keyboard
// navigation, typeahead, and open/close to PlanListbox.update, writes the next
// Listbox Model back, routes generated delivery and Command results, and
// hands any OutMessage to the OutMessage fold.
const PlanListboxBinding = PlanPickerDefinition.makeBinding(PlanListbox, {
  field: 'listbox',
  init: { contextToArgs: () => Tuple.make({ id: 'plan' }) },
}).withOutMessagePolicy({ fold: foldListboxOutMessage })

const PlanPickerComposition = PlanPickerDefinition.makeComposition({
  bindings: [PlanListboxBinding],
})

// In your init function, initialize the Listbox Block with a unique id:
const init = PlanPickerComposition.makeInit(() => ({
  model: {
    maybePlan: Option.none(),
    // ...your other fields
  },
}))

// The Composition routes generated Listbox delivery through the Binding.
const update = PlanPickerComposition.makeUpdate({})

const plans: ReadonlyArray<typeof Plan.Type> = ['Free', 'Pro', 'Enterprise']

// Inside your view function, embed the Listbox via h.block using
// its canonical view. Associate a visible label with the trigger via a native
// `<label for>`: target the trigger id with `buttonId('plan')` from `@foldkit/ui/listbox`. The
// `for` association gives the trigger both its accessible name and
// click-to-focus, so ariaLabelledBy is not needed here.
const view = PlanPickerComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.label([h.For(ListboxButtonId('plan'))], ['Plan']),
      h.block(
        PlanListboxBinding.embedView({
          slotId: 'plan',
          model: model.listbox,
          viewInputs: {
            // `items` must be ReadonlyArray<Plan>. The factory's <Plan> parameter constrains the shape.
            items: plans,
            // The parent owns the selection and passes it in. Single-select
            // takes an Option: None when nothing is selected yet.
            maybeSelectedValue: model.maybePlan,
            buttonContent: h.span(
              [],
              [Option.getOrElse(model.maybePlan, () => 'Select a plan')],
            ),
            buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
            itemsClassName: 'rounded-lg border shadow-lg',
            itemToConfig: (plan, { isSelected, isActive }) => ({
              className: isActive ? 'bg-blue-100' : '',
              content: h.div(
                [h.Class('flex items-center gap-2 px-3 py-2')],
                [
                  isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')]),
                  h.span([], [plan]),
                ],
              ),
            }),
            backdropClassName: 'fixed inset-0',
            anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
          },
        }),
      ),
    ],
  ),
)
