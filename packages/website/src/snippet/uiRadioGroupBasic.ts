// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

type Plan = 'Startup' | 'Business' | 'Enterprise'

// Declare a typed RadioGroup once at module scope. `view` and `update`
// are bound to the same value type:
const PlanRadioGroup = Ui.RadioGroup.create<Plan>()

// Add a field to your Model for the RadioGroup Submodel, plus a field
// for the selected plan your app actually cares about:
const Model = S.Struct({
  maybePlan: S.Option(S.String),
  radioGroup: Ui.RadioGroup.Model,
  // ...your other fields
})

// In your init function, initialize the RadioGroup Submodel with a unique id:
const init = () => [
  {
    maybePlan: Option.none(),
    radioGroup: Ui.RadioGroup.init({ id: 'plan' }),
    // ...your other fields
  },
  [],
]

// Embed the RadioGroup Message in your parent Message:
const GotRadioGroupMessage = m('GotRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// PlanRadioGroup.update. The OutMessage's `Selected` carries the chosen
// value typed as `Plan` (the type param at the factory):
GotRadioGroupMessage: ({ message }) => {
  const [nextRadioGroup, commands, maybeOutMessage] = PlanRadioGroup.update(
    model.radioGroup,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotRadioGroupMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { radioGroup: () => nextRadioGroup }),
      mappedCommands,
    ],
    onSome: M.type<Ui.RadioGroup.OutMessage<Plan>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            radioGroup: () => nextRadioGroup,
            maybePlan: () => Option.some(value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

// Inside your view function, embed the radio group via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'plan',
    model: model.radioGroup,
    view: PlanRadioGroup.view,
    viewInputs: {
      options: plans,
      ariaLabel: 'Server plan',
      toView: ({ group, options }) =>
        h.div(
          [...group, h.Class('flex flex-col gap-3')],
          options.map(option => {
            const plan = option.value
            return h.div(
              [
                ...option.option,
                h.Class(
                  'rounded-lg border p-4 cursor-pointer data-[checked]:border-blue-600',
                ),
              ],
              [
                h.span(
                  [...option.label, h.Class('text-sm font-medium')],
                  [plan],
                ),
                h.p(
                  [...option.description, h.Class('text-sm text-gray-500')],
                  [descriptions[plan]],
                ),
              ],
            )
          }),
        ),
    },
    toParentMessage: message => GotRadioGroupMessage({ message }),
  })
}
