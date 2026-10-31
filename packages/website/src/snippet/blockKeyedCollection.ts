import { Array, Effect, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'

const Model = Schema.Struct({
  rows: Schema.Array(Counter),
  nextRowId: Schema.Number,
})
type Model = typeof Model.Type

export class CounterList extends Block<CounterList>()('CounterList', {
  Model,
  Message: defineMessageUnion({
    ClickedAddRow: {},
    ClickedRemoveRow: { id: Schema.String },
  }),
}) {}

const removeRow = (model: Model, rowId: string): Model =>
  modifyFields(model, {
    rows: Array.filter(counter => counter.id !== rowId),
  })

export const CounterListLive = CounterList.make(
  Effect.fn(function* () {
    const row = yield* Counter.each('rows', { max: 5 })

    return {
      model: { rows: [], nextRowId: 0 },

      update: {
        ClickedAddRow: model => ({
          model: modifyFields(model, {
            rows: Array.append(row(`row-${model.nextRowId}`)),
            nextRowId: Number.increment,
          }),
        }),
        ClickedRemoveRow: (model, { id }) => ({ model: removeRow(model, id) }),

        ...row.on({
          ReachedMax: (model, _outMessage, counter) => ({
            model: removeRow(model, counter.id),
          }),
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            ...Array.map(model.rows, counter =>
              h.keyed('div')(
                counter.id,
                [h.Class('flex gap-2')],
                [
                  counter.view(),
                  h.button(
                    [
                      h.OnClick(
                        CounterList.Message.ClickedRemoveRow({
                          id: counter.id,
                        }),
                      ),
                    ],
                    ['Remove'],
                  ),
                ],
              ),
            ),
            h.button(
              [h.OnClick(CounterList.Message.ClickedAddRow())],
              ['Add row'],
            ),
          ],
        ),
    }
  }),
)
