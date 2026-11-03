import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import {
  layer as VirtualListLayer,
  ScrollContainer as VirtualListScrollContainer,
  makeBlock as makeVirtualListBlock,
} from '@foldkit/ui/virtualList'

const Invoice = Schema.Struct({
  id: Schema.String,
  customer: Schema.String,
  total: Schema.String,
})
type Invoice = typeof Invoice.Type

const InvoiceRowsBlock = makeVirtualListBlock<Invoice>()
const Model = Schema.Struct({
  invoices: Schema.Array(Invoice),
  invoiceRows: InvoiceRowsBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedJumpToLastInvoice: {} })
type Message = typeof Message.Type

const InvoiceTableKey = Symbol('InvoiceTable')

const InvoiceTableDefinition = Block.makeDefinition('InvoiceTable', {
  key: InvoiceTableKey,
  Init: Schema.Tuple([Schema.Array(Invoice)]),
  view: { kind: 'Element' },
  Model,
  Message,
})
const { makeNoopStep } = InvoiceTableDefinition

const InvoiceRowsBinding = InvoiceTableDefinition.makeBinding(
  InvoiceRowsBlock,
  {
    field: 'invoiceRows',
    init: {
      contextToArgs: () => [
        {
          id: 'invoice-rows',
          rowHeightPx: 48,
          scrollContainer: VirtualListScrollContainer.Ancestor({
            selector: '#invoice-scroll',
          }),
        },
      ],
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
const init = InvoiceTableComposition.makeInit(invoices => ({
  model: { invoices },
}))
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

export const InvoiceTableBlock = InvoiceTableDefinition.contract

export const layer = InvoiceTableDefinition.makeBlock(
  Effect.gen(function* () {
    const invoiceRows = yield* InvoiceRowsBinding

    return { children: [invoiceRows], init, update, view }
  }),
).provide(VirtualListLayer).layer
