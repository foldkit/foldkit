// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'
import type { RenderInfo as RadioGroupRenderInfo } from '@foldkit/ui/radioGroup'

const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])

const PlanRadioGroup = RadioGroup.create<typeof Plan.Type>()

// Add fields to your Model for the RadioGroup Block and the selected
// value. The Block keeps private keyboard-focus state; the parent owns
// the selection and passes it back in as selectedValue.
const Model = Schema.Struct({
  planRadioGroup: PlanRadioGroup.Model,
  maybePlan: Schema.Option(Plan),
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const PlanPickerDefinition = Block.makeDefinition('PlanPicker', {
  Model,
  Message,
})

const { makeFieldsStep } = PlanPickerDefinition

const plans: ReadonlyArray<typeof Plan.Type> = [
  'Startup',
  'Business',
  'Enterprise',
]

const descriptions: Record<typeof Plan.Type, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

// At module scope, fold the OutMessage into your own Model. The `Selected`
// arm carries the chosen value (typed as `Plan`) and its index, and returns
// a parent Step. This arm is also where the parent updates its own state or
// dispatches Commands, for example to persist the choice or price the order.
const foldPlanRadioGroupOutMessage = PlanPickerDefinition.makeOutMessageFold(
  PlanRadioGroup,
  {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybePlan: () => Option.some(value),
      })),
  },
)

// The Binding wires the completed child Block into the parent: it runs the child update,
// writes the child Model back, routes generated delivery and Command results,
// and hands any OutMessage to the OutMessage fold.
const PlanRadioGroupBinding = PlanPickerDefinition.makeBinding(PlanRadioGroup, {
  field: 'planRadioGroup',
  init: { contextToArgs: () => Tuple.make({ id: 'plan' }) },
}).withOutMessagePolicy({ fold: foldPlanRadioGroupOutMessage })

const PlanPickerComposition = PlanPickerDefinition.makeComposition({
  bindings: [PlanRadioGroupBinding],
})

// In your init function, initialize the RadioGroup Block with a unique
// id and start with nothing selected:
const init = PlanPickerComposition.makeInit(() => ({
  model: {
    maybePlan: Option.none(),
    // ...your other fields
  },
}))

const update = PlanPickerComposition.makeUpdate({})

// Inside your view function, embed the radio group via h.block and pass
// the parent-owned selection as selectedValue:
const view = PlanPickerComposition.makeView((model, h) => {
  const radioGroupView = ({
    group,
    options,
  }: RadioGroupRenderInfo<typeof Plan.Type>) =>
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
    )

  return h.block(
    PlanRadioGroupBinding.embedView({
      slotId: model.planRadioGroup.id,
      model: model.planRadioGroup,
      viewInputs: {
        options: plans,
        selectedValue: model.maybePlan,
        ariaLabel: 'Server plan',
        hasOptionDescription: () => true,
        toView: radioGroupView,
      },
    }),
  )
})
