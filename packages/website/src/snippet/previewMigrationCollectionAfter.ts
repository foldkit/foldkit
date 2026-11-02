import { Array, Layer, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const RowMessage = defineMessageUnion({ ClickedRemove: {} })

export class Row extends Block<Row, Readonly<{ label: string }>>()('Row', {
  Model: Schema.Struct({ label: Schema.String }),
  Message: RowMessage,
  OutMessage: defineMessageUnion({ RequestedRemoval: {} }),
}) {}

export const RowLive = Row.toLayer(() => ({
  init: ({ label }) => ({ label }),
  update: {
    ClickedRemove: model => ({
      model,
      outMessage: Row.OutMessage.RequestedRemoval(),
    }),
  },
  view: (model, h) =>
    h.span(
      [],
      [model.label, h.button([h.OnClick(RowMessage.ClickedRemove())], ['×'])],
    ),
}))

const Message = defineMessageUnion({ ClickedAddRow: {} })

export class Table extends Block<Table>()('Table', {
  Model: Schema.Struct({ rows: Schema.Array(Row), nextRowId: Schema.Number }),
  Message,
}) {}

export const TableLive = Table.toLayer(() => ({
  init: () => ({ rows: [], nextRowId: 0 }),

  update: {
    ClickedAddRow: model => ({
      model: modifyFields(model, {
        rows: Array.append(
          new Row(`row-${model.nextRowId}`, { label: 'New row' }),
        ),
        nextRowId: Number.increment,
      }),
    }),
    // One entry handles every Row the Model holds.
    ...Row.on({
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
})).pipe(Layer.provide(RowLive))
