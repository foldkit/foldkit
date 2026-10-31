import { Array, Effect, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const RowMessage = defineMessageUnion({ ClickedRemove: {} })

export class Row extends Block<Row, Readonly<{ label: string }>>()('Row', {
  Model: Schema.Struct({ label: Schema.String }),
  Message: RowMessage,
  OutMessage: defineMessageUnion({ RequestedRemoval: {} }),
}) {}

export const RowLive = Row.make(
  Effect.fn(function* (_id, { label }) {
    return {
      model: { label },
      update: {
        ClickedRemove: model => ({
          model,
          outMessage: Row.OutMessage.RequestedRemoval(),
        }),
      },
      view: (model, h) =>
        h.span(
          [],
          [
            model.label,
            h.button([h.OnClick(RowMessage.ClickedRemove())], ['×']),
          ],
        ),
    }
  }),
)

const Message = defineMessageUnion({ ClickedAddRow: {} })

export class Table extends Block<Table>()('Table', {
  Model: Schema.Struct({ rows: Schema.Array(Row), nextRowId: Schema.Number }),
  Message,
}) {}

export const TableLive = Table.make(
  Effect.fn(function* () {
    // One factory for the collection. Each key creates one instance.
    const row = yield* Row.each('rows', { label: 'New row' })

    return {
      model: { rows: [], nextRowId: 0 },

      update: {
        ClickedAddRow: model => ({
          model: modifyFields(model, {
            rows: Array.append(row(`row-${model.nextRowId}`)),
            nextRowId: Number.increment,
          }),
        }),
        ...row.on({
          RequestedRemoval: (model, _outMessage, removedRow) => ({
            model: modifyFields(model, {
              rows: Array.filter(({ id }) => id !== removedRow.id),
            }),
          }),
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.ul(
              [],
              Array.map(model.rows, tableRow =>
                h.keyed('li')(tableRow.id, [], [tableRow.view()]),
              ),
            ),
            h.button([h.OnClick(Message.ClickedAddRow())], ['Add row']),
          ],
        ),
    }
  }),
).pipe(Layer.provide(RowLive))
