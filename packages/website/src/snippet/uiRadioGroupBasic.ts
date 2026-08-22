// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'

const Plan = S.Literals(['Startup', 'Business', 'Enterprise'])
type Plan = typeof Plan.Type

// Add fields to your Model for the RadioGroup Submodel and the selected
// value. The Submodel keeps private keyboard-focus state; the parent owns
// the selection and passes it back in as selectedValue.
const Model = S.Struct({
  planRadioGroup: RadioGroup.Model,
  maybePlan: S.Option(Plan),
  // ...your other fields
})
type Model = typeof Model.Type

// In your init function, initialize the RadioGroup Submodel with a unique
// id and start with nothing selected:
const init = () => ({
  model: {
    planRadioGroup: RadioGroup.init({ id: 'plan' }),
    maybePlan: Option.none(),
    // ...your other fields
  },
})

// Embed the RadioGroup Message in your parent Message:
const Message = defineMessageUnion({
  GotPlanRadioGroupMessage: { message: RadioGroup.Message },
})

type Message = typeof Message.Type // ...united with your others

// Declare a typed RadioGroup factory once at module scope. The Value
// generic types option.value in toView so the consumer can switch on it
// without casting:
const PlanRadioGroup = RadioGroup.create<Plan>()

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

// At module scope, fold the OutMessage into your own Model. The `Selected`
// arm carries the chosen value (typed as `Plan`) and its index, and returns
// an Update.Step. This arm is also where the parent updates its own state or
// dispatches Commands, for example to persist the choice or price the order.
const foldPlanRadioGroupOutMessage = M.type<RadioGroup.OutMessage<Plan>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { maybePlan: () => Option.some(value) }) }),
  }),
)

// Update.foldChild wires the child into the parent: it runs the child update,
// writes the child Model back, maps the child's Commands into your Message
// type, and hands any OutMessage to foldOutMessage.
const foldPlanRadioGroup = Update.foldChild({
  update: PlanRadioGroup.update,
  read: (model: Model) => Option.some(model.planRadioGroup),
  write: (model, nextPlanRadioGroup) =>
    evo(model, { planRadioGroup: () => nextPlanRadioGroup }),
  toParentMessage: message => Message.GotPlanRadioGroupMessage({ message }),
  foldOutMessage: foldPlanRadioGroupOutMessage,
})

// Inside your update function's Message.match({...}), call the fold:
GotPlanRadioGroupMessage: ({ message }) => foldPlanRadioGroup(model, message)

// Inside your view function, embed the radio group via h.submodel and pass
// the parent-owned selection as selectedValue:
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: model.planRadioGroup.id,
    model: model.planRadioGroup,
    view: PlanRadioGroup.view,
    viewInputs: {
      options: plans,
      selectedValue: model.maybePlan,
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
    toParentMessage: message => Message.GotPlanRadioGroupMessage({ message }),
  })
