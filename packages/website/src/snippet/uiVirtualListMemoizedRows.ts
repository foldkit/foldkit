import { Schema } from 'effect'
import { type HtmlBuilder, createKeyedLazy } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Row = Schema.Struct({ id: Schema.String, label: Schema.String })
type Row = typeof Row.Type

const Model = Schema.Struct({
  rows: Schema.Array(Row),
  list: VirtualList.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  GotListMessage: { message: VirtualList.Message },
})
type Message = typeof Message.Type

const rowView = (row: Row, h: HtmlBuilder<Message>) => h.span([], [row.label])
const lazyRow = createKeyedLazy({ evict: 'AbsentFromRender' })

const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'rows',
    model: model.list,
    view: VirtualList.view<Row>(),
    viewInputs: {
      items: model.rows,
      itemToKey: row => row.id,
      itemToView: row => lazyRow(row.id, rowView, [row, h]),
      containerClassName: 'h-96',
    },
    toParentMessage: message => Message.GotListMessage({ message }),
  })
