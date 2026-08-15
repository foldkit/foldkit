// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'

const Plan = S.Literals(['Free', 'Pro', 'Enterprise'])
type Plan = typeof Plan.Type

// Declare a typed Listbox once at module scope. `view` and `update` are
// bound to `Plan`: `items` is typed as `ReadonlyArray<Plan>` and the
// OutMessage carries `value: Plan`.
const PlanListbox = Listbox.create<Plan>()

// Add a field to your Model for the Listbox Submodel, plus a field for
// the selected value your app actually cares about. Using the `Plan`
// Schema keeps the field literal-typed end to end:
const Model = S.Struct({
  maybePlan: S.Option(Plan),
  listbox: Listbox.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    maybePlan: Option.none(),
    listbox: Listbox.init({ id: 'plan' }),
    // ...your other fields
  },
  [],
]

// Wrap Listbox's Messages so they can flow through your update:
const GotListboxMessage = m('GotListboxMessage', {
  message: Listbox.Message,
})

// At module scope, fold the OutMessage into your own Model. When the user
// commits a selection it carries `Selected({ value })` where `value: Plan`.
// The arm returns an Update.Step over the parent Model, which already has the
// next Listbox Model written back:
const foldListboxOutMessage = M.type<Listbox.OutMessage<Plan>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => [evo(model, { maybePlan: () => Option.some(value) }), []],
  }),
)

// Update.foldChild wires the child into the parent: it delegates keyboard
// navigation, typeahead, and open/close to PlanListbox.update, writes the next
// Listbox Model back, maps the Submodel's Commands into your Message type, and
// hands any OutMessage to foldOutMessage.
const foldListbox = Update.foldChild({
  update: PlanListbox.update,
  read: (model: Model) => Option.some(model.listbox),
  write: (model, nextListbox) => evo(model, { listbox: () => nextListbox }),
  toParentMessage: message => GotListboxMessage({ message }),
  foldOutMessage: foldListboxOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotListboxMessage: ({ message }) => foldListbox(model, message)

const plans: ReadonlyArray<Plan> = ['Free', 'Pro', 'Enterprise']

// Inside your view function, embed the Listbox via h.submodel using
// `PlanListbox.view`. Associate a visible label with the trigger via a native
// `<label for>`: target the trigger id with `Listbox.buttonId('plan')`. The
// `for` association gives the trigger both its accessible name and
// click-to-focus, so ariaLabelledBy is not needed here.
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.label([h.For(Listbox.buttonId('plan'))], ['Plan']),
      h.submodel({
        slotId: 'plan',
        model: model.listbox,
        view: PlanListbox.view,
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
        toParentMessage: message => GotListboxMessage({ message }),
      }),
    ],
  )
