// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the RadioGroup Submodel:
const Model = S.Struct({
  radioGroup: Ui.RadioGroup.Model,
  // ...your other fields
})

// In your init function, initialize the RadioGroup Submodel with a unique id:
const init = () => [
  {
    radioGroup: Ui.RadioGroup.init({ id: 'plan' }),
    // ...your other fields
  },
  [],
]

// Embed the RadioGroup Message in your parent Message:
const GotRadioGroupMessage = m('GotRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to RadioGroup.update:
GotRadioGroupMessage: ({ message }) => {
  const [nextRadioGroup, commands] = Ui.RadioGroup.update(
    model.radioGroup,
    message,
  )

  return [
    // Merge the next state into your Model:
    evo(model, { radioGroup: () => nextRadioGroup }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotRadioGroupMessage({ message })),
      ),
    ),
  ]
}

type Plan = 'Startup' | 'Business' | 'Enterprise'
const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs — Perfect for small projects',
  Business: '16GB / 8 CPUs — For growing teams',
  Enterprise: '32GB / 12 CPUs — Dedicated infrastructure',
}

// Inside your view function, render the radio group:
const view = () => {
  const h = html<Message>()

  return Ui.RadioGroup.view<Message, Plan>({
    model: model.radioGroup,
    toParentMessage: message => GotRadioGroupMessage({ message }),
    options: plans,
    ariaLabel: 'Server plan',
    optionToConfig: (plan, { isSelected }) => ({
      value: plan,
      content: attributes =>
        h.div(
          [
            ...attributes.option,
            h.Class(
              'rounded-lg border p-4 cursor-pointer data-[checked]:border-blue-600',
            ),
          ],
          [
            h.span(
              [...attributes.label, h.Class('text-sm font-medium')],
              [plan],
            ),
            h.p(
              [...attributes.description, h.Class('text-sm text-gray-500')],
              [descriptions[plan]],
            ),
          ],
        ),
    }),
    attributes: [h.Class('flex flex-col gap-3')],
  })
}
