import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ ClickedAddRow: { rowId: Schema.String } })

export class Row extends Block<Row>()('Row', {}) {}

export class Table extends Block<Table>()('Table', {
  Model: Schema.Struct({ rows: Schema.Array(Row) }),
  Message,
}) {}

export const TableLive = Table.toLayer(
  Effect.gen(function* () {
    return {
      init: () => ({ rows: [] }),
      update: {
        ClickedAddRow: (model, { rowId }) => ({
          model: { rows: [...model.rows, new Row(rowId)] },
        }),
      },
      view: (model, h) =>
        h.ul(
          [],
          model.rows.map((instance, index) =>
            h.keyed('li')(instance.id, [h.DataAttribute('index', `${index}`), h.Title(new Date(index).toISOString())], [instance.view()]),
          ),
        ),
    }
  }),
)
