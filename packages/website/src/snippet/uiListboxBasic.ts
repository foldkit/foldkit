import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'
import { buttonId as ListboxButtonId } from '@foldkit/ui/listbox'

const Plan = Schema.Literals(['Free', 'Pro', 'Enterprise'])
type Plan = typeof Plan.Type

// Declare a typed Listbox once at module scope. Its view takes
// `items: ReadonlyArray<Plan>` and its `Selected` OutMessage carries a `Plan`.
const PlanListbox = Listbox.makeBlock<Plan>()

const plans: ReadonlyArray<Plan> = ['Free', 'Pro', 'Enterprise']

export class PlanPicker extends Block<PlanPicker>()('PlanPicker', {
  Model: Schema.Struct({
    listbox: PlanListbox,
    maybePlan: Schema.Option(Plan),
  }),
}) {}

export const PlanPickerLive = PlanPicker.make(
  Effect.fn(function* () {
    const listbox = yield* new PlanListbox('listbox', { id: 'plan' })

    return {
      model: { listbox, maybePlan: Option.none() },

      update: {
        // The parent owns the selection: store the committed value
        ...listbox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { maybePlan: () => Option.some(value) }),
          }),
        }),
      },

      // A native `<label for>` targeting `buttonId('plan')` gives the trigger
      // its accessible name, so `ariaLabelledBy` is not needed here
      view: (model, h) =>
        h.div(
          [],
          [
            h.label([h.For(ListboxButtonId('plan'))], ['Plan']),
            model.listbox.view({
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
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(PlanListbox.Live))
