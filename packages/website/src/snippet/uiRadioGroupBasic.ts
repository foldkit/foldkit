import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { RadioGroup } from '@foldkit/ui'
import type { RenderInfo as RadioGroupRenderInfo } from '@foldkit/ui/radioGroup'

const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])
type Plan = typeof Plan.Type

const PlanRadioGroup = RadioGroup.makeBlock<Plan>()

const plans: ReadonlyArray<Plan> = ['Startup', 'Business', 'Enterprise']

const descriptions: Record<Plan, string> = {
  Startup: '12GB / 6 CPUs. Perfect for small projects',
  Business: '16GB / 8 CPUs. For growing teams',
  Enterprise: '32GB / 12 CPUs. Dedicated infrastructure',
}

// The RadioGroup keeps private keyboard-focus state. The parent owns the
// selection and passes it back in as `selectedValue`.
export class PlanPicker extends Block<PlanPicker>()('PlanPicker', {
  Model: Schema.Struct({
    planRadioGroup: PlanRadioGroup,
    maybePlan: Schema.Option(Plan),
  }),
}) {}

export const PlanPickerLive = PlanPicker.make(
  Effect.fn(function* () {
    const planRadioGroup = yield* new PlanRadioGroup('planRadioGroup', {
      id: 'plan',
    })

    return {
      model: { planRadioGroup, maybePlan: Option.none() },

      update: {
        // `Selected` carries the chosen value, typed as `Plan`, and its index
        ...planRadioGroup.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { maybePlan: () => Option.some(value) }),
          }),
        }),
      },

      view: (model, h) => {
        const radioGroupView = ({
          group,
          options,
        }: RadioGroupRenderInfo<Plan>) =>
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
          )

        return model.planRadioGroup.view({
          options: plans,
          selectedValue: model.maybePlan,
          ariaLabel: 'Server plan',
          hasOptionDescription: () => true,
          toView: radioGroupView,
        })
      },
    }
  }),
).pipe(Layer.provide(PlanRadioGroup.Live))
