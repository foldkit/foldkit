import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Invoice = Schema.Struct({
  id: Schema.String,
  customer: Schema.String,
  total: Schema.String,
})
type Invoice = typeof Invoice.Type

const InvoiceRows = VirtualList.makeBlock<Invoice>()

const Message = defineMessageUnion({ ClickedJumpToLastInvoice: {} })

export class InvoiceTable extends Block<
  InvoiceTable,
  Readonly<{ invoices: ReadonlyArray<Invoice> }>
>()('InvoiceTable', {
  Model: Schema.Struct({
    invoices: Schema.Array(Invoice),
    invoiceRows: InvoiceRows,
  }),
  Message,
}) {}

export const InvoiceTableLive = InvoiceTable.make(
  Effect.fn(function* (_id, { invoices }) {
    // An ancestor element scrolls, not the list
    const invoiceRows = yield* new InvoiceRows('invoiceRows', {
      id: 'invoice-rows',
      rowHeightPx: 48,
      scrollContainer: VirtualList.ScrollContainer.Ancestor({
        selector: '#invoice-scroll',
      }),
    })

    return {
      model: { invoices, invoiceRows },

      update: {
        ClickedJumpToLastInvoice: model => ({
          model,
          messages: [model.invoiceRows.send(VirtualList.requestScrollToEnd())],
        }),
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [h.OnClick(Message.ClickedJumpToLastInvoice())],
              ['Last invoice'],
            ),
            h.div(
              [h.Id('invoice-scroll'), h.Class('h-96 overflow-auto')],
              [
                h.table(
                  [
                    h.Class('w-full table-fixed border-collapse'),
                    h.AriaRowcount(model.invoices.length + 1),
                  ],
                  [
                    h.caption([], ['Invoices']),
                    h.colgroup(
                      [],
                      [
                        h.col([h.Class('w-36')]),
                        h.col([]),
                        h.col([h.Class('w-28')]),
                      ],
                    ),
                    h.thead(
                      [],
                      [
                        h.tr(
                          [],
                          [
                            h.th([h.Scope('col')], ['Invoice']),
                            h.th([h.Scope('col')], ['Customer']),
                            h.th([h.Scope('col')], ['Total']),
                          ],
                        ),
                      ],
                    ),
                    model.invoiceRows.view({
                      items: model.invoices,
                      itemToKey: invoice => invoice.id,
                      containerElement: 'tbody',
                      rowElement: 'tr',
                      tableColumns: 3,
                      itemToAttributes: (_invoice, index) =>
                        childAttributes([h.AriaRowindex(index + 2)]),
                      itemToView: invoice => [
                        h.th(
                          [h.Scope('row'), h.Class('px-3 text-left')],
                          [invoice.id],
                        ),
                        h.td([h.Class('px-3')], [invoice.customer]),
                        h.td([h.Class('px-3 text-right')], [invoice.total]),
                      ],
                    }),
                  ],
                ),
              ],
            ),
          ],
        ),
    }
  }),
).pipe(Layer.provide(InvoiceRows.Live))
