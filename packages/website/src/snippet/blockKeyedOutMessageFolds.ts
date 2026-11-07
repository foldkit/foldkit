import { Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const ItemModel = Schema.Struct({ label: Schema.String })
export type ItemModel = typeof ItemModel.Type
export const ItemMessage = defineMessageUnion({ ClickedSelect: {} })
export type ItemMessage = typeof ItemMessage.Type
export const ItemOutMessage = defineMessageUnion({
  Selected: { label: Schema.String },
})
export type ItemOutMessage = typeof ItemOutMessage.Type

export const ItemKey = Symbol('Item')
export const ItemBlock = Block.make('Item', {
  key: ItemKey,
  Model: ItemModel,
  Message: ItemMessage,
  OutMessage: ItemOutMessage,
  InitArgs: Schema.Tuple([]),
})

export const CatalogModel = Schema.Struct({
  categories: Schema.Record(Schema.String, ItemBlock.Model),
  items: Schema.Record(Schema.String, ItemBlock.Model),
  maybeSelectedLabel: Schema.Option(Schema.String),
  maybeSelectedItemId: Schema.Option(Schema.String),
})
export type CatalogModel = typeof CatalogModel.Type
export const CatalogKey = Symbol('Catalog')
const CatalogBlock = Block.make('Catalog', {
  key: CatalogKey,
  Model: CatalogModel,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
})
const { makeRecordBinding, makeFieldsStep, makeOutMessageFold } = CatalogBlock

export const CategoriesBinding = makeRecordBinding(ItemBlock, {
  field: 'categories',
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ItemBlock, {
    Selected: ({ label }) =>
      makeFieldsStep(() => ({
        maybeSelectedLabel: () => Option.some(label),
      })),
  }),
})

export const ItemsBinding = makeRecordBinding(ItemBlock, {
  field: 'items',
}).withOutMessagePolicy({
  fold: itemId =>
    makeOutMessageFold(ItemBlock, {
      Selected: ({ label }) =>
        makeFieldsStep(() => ({
          maybeSelectedLabel: () => Option.some(label),
          maybeSelectedItemId: () => Option.some(itemId),
        })),
    }),
})

export const CatalogComposition = CatalogBlock.makeComposition({
  bindings: [CategoriesBinding, ItemsBinding],
})
