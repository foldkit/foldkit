// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

type Plan = 'Free' | 'Pro' | 'Enterprise'

// Declare a typed Listbox once at module scope. `view` and `update` are
// bound to `Plan`: `items` is typed as `ReadonlyArray<Plan>` and the
// OutMessage carries `value: Plan`.
const PlanListbox = Ui.Listbox.create<Plan>()

// Add a field to your Model for the Listbox Submodel, plus a field for
// the selected value your app actually cares about:
const Model = S.Struct({
  maybePlan: S.Option(S.String),
  listbox: Ui.Listbox.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    maybePlan: Option.none(),
    listbox: Ui.Listbox.init({ id: 'plan' }),
    // ...your other fields
  },
  [],
]

// Wrap Listbox's Messages so they can flow through your update:
const GotListboxMessage = m('GotListboxMessage', {
  message: Ui.Listbox.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate keyboard
// navigation, typeahead, and open/close to PlanListbox.update. The
// third tuple element is `Option<OutMessage>`; when the user commits a
// selection it carries `Selected({ value })` where `value: Plan`:
GotListboxMessage: ({ message }) => {
  const [nextListbox, commands, maybeOutMessage] = PlanListbox.update(
    model.listbox,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotListboxMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { listbox: () => nextListbox }), mappedCommands],
    onSome: M.type<Ui.Listbox.OutMessage<Plan>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            listbox: () => nextListbox,
            maybePlan: () => Option.some(value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

const plans: ReadonlyArray<Plan> = ['Free', 'Pro', 'Enterprise']

// Inside your view function, embed the Listbox via h.submodel using
// `PlanListbox.view`:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'plan',
    model: model.listbox,
    view: PlanListbox.view,
    viewInputs: {
      // `items` must be ReadonlyArray<Plan>. The factory's <Plan> parameter constrains the shape.
      items: plans,
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
            isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')], []),
            h.span([], [plan]),
          ],
        ),
      }),
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage: message => GotListboxMessage({ message }),
  })
}
