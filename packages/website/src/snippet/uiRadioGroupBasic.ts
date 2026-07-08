// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

const RADIO_GROUP_ID = 'plan'

const Plan = S.Literals(['Startup', 'Business', 'Enterprise'])
type Plan = typeof Plan.Type

// Your Model owns the selected value. RadioGroup keeps no state of its own:
const Model = S.Struct({
  maybePlan: S.Option(Plan),
  // ...your other fields
})

// In your init function, start with nothing selected:
const init = () => [
  {
    maybePlan: Option.none(),
    // ...your other fields
  },
  [],
]

// A Message carrying the committed value. The radio group manages focus
// itself, so no focus command or acknowledgement reaches your update:
const SelectedPlan = m('SelectedPlan', { plan: Plan })

const Message = S.Union([SelectedPlan])

// Inside your update function's M.tagsExhaustive({...}), just store the value:
const update = (model, message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      SelectedPlan: ({ plan }) => [
        evo(model, { maybePlan: () => Option.some(plan) }),
        [],
      ],
    }),
  )

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

// Inside your view function, call RadioGroup.view directly:
const view = model => {
  const h = html<Message>()

  return RadioGroup.view<Plan, Message>({
    id: RADIO_GROUP_ID,
    selectedValue: model.maybePlan,
    options: plans,
    ariaLabel: 'Server plan',
    onSelect: plan => SelectedPlan({ plan }),
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
              h.span([...option.label, h.Class('text-sm font-medium')], [plan]),
              h.p(
                [...option.description, h.Class('text-sm text-gray-500')],
                [descriptions[plan]],
              ),
            ],
          )
        }),
      ),
  })
}
