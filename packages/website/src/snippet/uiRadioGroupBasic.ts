import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, p, span } from './html'

// Add a field to your Model for the RadioGroup Submodel:
const Model = S.Struct({
  radioGroup: Ui.RadioGroup.Model,
  // ...your other fields
})

// Initialize it with a unique id:
const initialModel = {
  radioGroup: Ui.RadioGroup.init({ id: 'plan' }),
}

// Embed the RadioGroup Message in your parent Message:
const GotRadioGroupMessage = m('GotRadioGroupMessage', {
  message: Ui.RadioGroup.Message,
})

// In your update, delegate to RadioGroup.update:
GotRadioGroupMessage: ({ message }) => {
  const [nextRadioGroup, commands] = Ui.RadioGroup.update(
    model.radioGroup,
    message,
  )

  return [
    evo(model, { radioGroup: () => nextRadioGroup }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotRadioGroupMessage({ message })),
      ),
    ),
  ]
}

// In your view:
type Plan = 'Startup' | 'Business' | 'Enterprise'
const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs — Perfect for small projects',
  Business: '16GB / 8 CPUs — For growing teams',
  Enterprise: '32GB / 12 CPUs — Dedicated infrastructure',
}

Ui.RadioGroup.view<Message, Plan>({
  model: model.radioGroup,
  toParentMessage: message => GotRadioGroupMessage({ message }),
  options: plans,
  ariaLabel: 'Server plan',
  optionToConfig: (plan, { isSelected }) => ({
    value: plan,
    content: attributes =>
      div(
        [
          ...attributes.option,
          Class(
            'rounded-lg border p-4 cursor-pointer data-[checked]:border-blue-600',
          ),
        ],
        [
          span([...attributes.label, Class('text-sm font-medium')], [plan]),
          p(
            [...attributes.description, Class('text-sm text-gray-500')],
            [descriptions[plan]],
          ),
        ],
      ),
  }),
  attributes: [Class('flex flex-col gap-3')],
})
