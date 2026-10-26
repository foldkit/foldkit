import { Option, Schema, Tuple } from 'effect'
// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Combobox, Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
const CityCombobox = Combobox.create(City)
const cities: ReadonlyArray<typeof City.Type> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

// One Model field for the dialog, one for the overlay it contains, plus
// the parent-owned selection (`City` and `CityCombobox` are the
// `Schema.Literals` Schema and typed factory from the Combobox example):
const Model = Schema.Struct({
  dialog: Dialog.DialogBlock.Model,
  combobox: CityCombobox.Model,
  maybeCity: Schema.Option(City),
  // ...your other fields
})

// This excerpt has no parent-owned facts. The two Bindings derive distinct
// generated delivery for Dialog and Combobox.
const Message = defineMessageUnion({})

const FilterDialogDefinition = Block.makeDefinition('FilterDialog', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = FilterDialogDefinition

const foldDialogOutMessage = FilterDialogDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  },
)

const foldComboboxOutMessage = FilterDialogDefinition.makeOutMessageFold(
  CityCombobox,
  {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeCity: () => Option.some(value),
      })),
    ClearedSelection: makeNoopStep,
  },
)

const DialogBinding = FilterDialogDefinition.makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: { contextToArgs: () => Tuple.make({ id: 'edit-filters' }) },
}).withOutMessagePolicy({ fold: foldDialogOutMessage })

const ComboboxBinding = FilterDialogDefinition.makeBinding(CityCombobox, {
  field: 'combobox',
  init: { contextToArgs: () => Tuple.make({ id: 'city' }) },
}).withOutMessagePolicy({ fold: foldComboboxOutMessage })

const FilterDialogComposition = FilterDialogDefinition.makeComposition({
  bindings: [DialogBinding, ComboboxBinding],
})

const init = FilterDialogComposition.makeInit(() => ({
  model: {
    maybeCity: Option.none(),
    // ...your other fields
  },
}))

const update = FilterDialogComposition.makeUpdate({})

// Render the overlay inside the dialog panel. Its panel portals into the
// dialog, so it renders above the dialog content with no extra anchor config.
// Give the panel `relative` so it paints above the Dialog backdrop, and the
// Combobox wrapper `relative` so the input stays above the Combobox backdrop,
// which goes directly before that wrapper.
const view = FilterDialogComposition.makeView((model, h) => {
  const dialogView = ({
    dialog,
    backdrop,
    panel,
    title,
    isVisible,
  }: DialogRenderInfo) =>
    h.dialog(
      [...dialog],
      isVisible
        ? [
            h.div([...backdrop, h.Class('fixed inset-0 bg-black/50')]),
            h.div(
              [
                ...panel,
                h.Class('relative rounded-lg p-6 max-w-md mx-auto shadow-xl'),
              ],
              [
                h.h2([...title], ['Edit filters']),
                h.block(
                  ComboboxBinding.embedView({
                    slotId: model.combobox.id,
                    model: model.combobox,
                    viewInputs: {
                      items: cities,
                      itemToConfig: city => ({ content: h.span([], [city]) }),
                      itemToValue: city => city,
                      itemToDisplayText: city => city,
                      className: 'relative w-full',
                      maybeSelectedValue: model.maybeCity,
                      restingInputValue: Option.getOrElse(
                        model.maybeCity,
                        () => '',
                      ),
                      anchor: { placement: 'bottom-start' },
                    },
                  }),
                ),
              ],
            ),
          ]
        : [],
    )

  return h.block(
    DialogBinding.embedView({
      slotId: model.dialog.id,
      model: model.dialog,
      viewInputs: {
        toView: dialogView,
      },
    }),
  )
})
