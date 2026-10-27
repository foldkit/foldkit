import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Invoice = Schema.Struct({
  id: Schema.String,
  customer: Schema.String,
  total: Schema.String,
})
const InvoiceRowsBlock = VirtualList.create<typeof Invoice.Type>()
const Model = Schema.Struct({
  invoices: Schema.Array(Invoice),
  invoiceRows: InvoiceRowsBlock.Model,
})
const Message = defineMessageUnion({ ClickedJumpToLastInvoice: {} })
const InvoiceTableDefinition = Block.makeDefinition('InvoiceTable', {
  Model,
  Message,
})
const { makeNoopStep } = InvoiceTableDefinition

const InvoiceRowsBinding = InvoiceTableDefinition.makeBinding(
  InvoiceRowsBlock,
  {
    field: 'invoiceRows',
    init: {
      contextToArgs: () =>
        Tuple.make({
          id: 'invoice-rows',
          rowHeightPx: 48,
          scrollContainer: VirtualList.ScrollContainer.Ancestor({
            selector: '#invoice-scroll',
          }),
        }),
    },
  },
).withOutMessagePolicy({
  fold: InvoiceTableDefinition.makeOutMessageFold(InvoiceRowsBlock, {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  }),
})
const InvoiceTableComposition = InvoiceTableDefinition.makeComposition({
  bindings: [InvoiceRowsBinding],
})
const init = InvoiceTableComposition.makeInit(
  (invoices: ReadonlyArray<typeof Invoice.Type>) => ({ model: { invoices } }),
)
const update = InvoiceTableComposition.makeUpdate({
  ClickedJumpToLastInvoice: InvoiceRowsBinding.requestScrollToEnd(),
})
const view = InvoiceTableComposition.makeView((model, h) =>
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
                [h.col([h.Class('w-36')]), h.col([]), h.col([h.Class('w-28')])],
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
              h.block(
                InvoiceRowsBinding.embedView({
                  slotId: 'invoice-rows',
                  model: model.invoiceRows,
                  viewInputs: {
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
                  },
                }),
              ),
            ],
          ),
        ],
      ),
    ],
  ),
)

const prepare = () =>
  InvoiceTableComposition.prepareBlock({ init, update, view })
export const InvoiceTableBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
