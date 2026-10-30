import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({ ClickedAddRow: {} })

export class Row extends Block<Row>()('Row', {}) {}

export class Table extends Block<Table>()('Table', {
  Model: Schema.Struct({ rows: Schema.Array(Row) }),
  Message,
}) {}

export const TableLive = Table.make(
  Effect.fn(function* () {
    const row = yield* Row.each('rows')
    return {
      model: { rows: [] },
      update: {
        ClickedAddRow: model => ({
          model: {
            rows: [...model.rows, ...['a', 'b'].map((_label, index) => row(`row-${index}`))],
          },
        }),
      },
    }
  }),
)
