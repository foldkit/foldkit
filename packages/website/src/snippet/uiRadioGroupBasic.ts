import { Effect, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  layer as RadioGroupLayer,
  type RenderInfo as RadioGroupRenderInfo,
  makeBlock as makeRadioGroupBlock,
} from '@foldkit/ui/radioGroup'

const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])
type Plan = typeof Plan.Type

const PlanRadioGroup = makeRadioGroupBlock<Plan>()

// Add fields to your Model for the RadioGroup Block and the selected
// value. The Block keeps private keyboard-focus state; the parent owns
// the selection and passes it back in as selectedValue.
const Model = Schema.Struct({
  planRadioGroup: PlanRadioGroup.Model,
  maybePlan: Schema.Option(Plan),
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

const PlanPickerKey = Symbol('PlanPicker')

const PlanPickerDefinition = Block.makeDefinition('PlanPicker', {
  key: PlanPickerKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeFieldsStep } = PlanPickerDefinition

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
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

// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const PlanRadioGroupBinding = PlanPickerDefinition.makeBinding(PlanRadioGroup, {
  field: 'planRadioGroup',
  init: { contextToArgs: () => [{ id: 'plan' }] },
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
  const radioGroupView = ({ group, options }: RadioGroupRenderInfo<Plan>) =>
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

export const ApplicationBlock = PlanPickerDefinition.makeBlock(
  Effect.gen(function* () {
    const planRadioGroup = yield* PlanRadioGroupBinding
    return { children: [planRadioGroup], init, update, view }
  }),
).provide(RadioGroupLayer)
