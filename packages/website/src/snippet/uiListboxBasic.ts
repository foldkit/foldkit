import { Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

const Plan = Schema.Literals(['Free', 'Pro', 'Enterprise'])
type Plan = typeof Plan.Type
// One passive contract retains Plan in its view inputs and OutMessages.
const PlanListbox = Listbox.makeBlock(Plan)

// Add a field to your Model for the Listbox Block, plus a field for
// the selected value your app actually cares about. Using the `Plan`
// Schema keeps the field literal-typed end to end:
const Model = Schema.Struct({
  maybePlan: Schema.Option(Plan),
  listbox: PlanListbox.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const PlanPickerKey = Symbol('PlanPicker')
export const PlanPickerBlock = Block.make('PlanPicker', {
  key: PlanPickerKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = PlanPickerBlock

// At module scope, fold the OutMessage into your own Model. When the user
// commits a selection it carries `Selected({ value })` where `value: Plan`.
// The arm returns an Update.Step over the parent Model, which already has the
// next Listbox Model written back. Passing the completed child Block preserves
// the factory's refined `Plan` payload without a repeated type argument:
// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const ListboxBinding = makeRequiredFieldBinding(PlanListbox, {
  field: 'listbox',
  init: { contextToArgs: () => [{ id: 'plan' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PlanListbox, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybePlan: () => Option.some(value),
      })),
  }),
})

const PlanPickerComposition = makeComposition({
  bindings: [ListboxBinding],
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

const plans: ReadonlyArray<Plan> = ['Free', 'Pro', 'Enterprise']

// Inside your view function, embed the Listbox via h.block using
// its canonical view. Associate a visible label with the trigger via a native
// `<label for>`: target the trigger id with `buttonId('plan')` from `@foldkit/ui/listbox`. The
// `for` association gives the trigger both its accessible name and
// click-to-focus, so ariaLabelledBy is not needed here.
const view = PlanPickerComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.label([h.For(Listbox.buttonId('plan'))], ['Plan']),
      h.block(
        ListboxBinding.embedView({
          slotId: 'plan',
          model: model.listbox,
          viewInputs: {
            // `items` must be ReadonlyArray<Plan>. The supplied Plan Schema constrains the shape.
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

export const layer = PlanPickerBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(Listbox.layer))
