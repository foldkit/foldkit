import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Combobox, Dialog } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

const City = Schema.Literals(['Johannesburg', 'Kyiv', 'Oxford', 'Wellington'])
type City = typeof City.Type

const CityCombobox = Combobox.makeBlock(City)

const cities: ReadonlyArray<City> = [
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Wellington',
]

const Message = defineMessageUnion({
  ClickedEditFilters: {},
})

export class FilterDialog extends Block<FilterDialog>()('FilterDialog', {
  Model: Schema.Struct({
    dialog: Dialog.Dialog,
    combobox: CityCombobox,
    maybeCity: Schema.Option(City),
  }),
  Message,
}) {}

export const FilterDialogLive = FilterDialog.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', { id: 'edit-filters' })
    const combobox = yield* new CityCombobox('combobox', { id: 'city' })

    return {
      model: { dialog, combobox, maybeCity: Option.none() },

      update: {
        ClickedEditFilters: model => ({
          model,
          messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
        }),

        ...combobox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { maybeCity: () => Option.some(value) }),
          }),
        }),
      },

      view: (model, h) => {
        // Render the Combobox inside the dialog panel. Its panel portals into
        // the dialog, so it renders above the dialog content with no extra
        // anchor config. The panel and the Combobox wrapper are `relative`.
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
                      h.Class(
                        'relative rounded-lg p-6 max-w-md mx-auto shadow-xl',
                      ),
                    ],
                    [
                      h.h2([...title], ['Edit filters']),
                      model.combobox.view({
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
                      }),
                    ],
                  ),
                ]
              : [],
          )

        return h.div(
          [],
          [
            h.button(
              [h.OnClick(Message.ClickedEditFilters())],
              ['Edit filters'],
            ),
            model.dialog.view({ toView: dialogView }),
          ],
        )
      },
    }
  }),
).pipe(Layer.provide(Layer.mergeAll(Dialog.DialogLive, CityCombobox.Live)))
