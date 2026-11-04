import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Query from 'foldkit/experimental/query'
import { defineMessageUnion } from 'foldkit/message'

import * as Listbox from '@foldkit/ui/listbox'

export const Fruit = Schema.Literals(['Apple', 'Pear'])
export type Fruit = typeof Fruit.Type
export class Catalog extends Context.Service<
  Catalog,
  Readonly<{ fruits: ReadonlyArray<string> }>
>()('FamilyConsumer/Catalog') {}
export const CatalogQueryBlock = Query.define({
  name: 'CatalogQuery',
  data: Schema.Array(Schema.String),
  error: Schema.String,
  handler: function* () {
    const catalog = yield* Catalog

    return () => Effect.succeed(catalog.fruits)
  },
})
export const FruitListboxBlock = Listbox.makeBlock<Fruit>()
export const Message = defineMessageUnion({ ClickedRefresh: {} })
export const ApplicationKey = Symbol('FamilyConsumer')
export const ApplicationBlock = Block.make('Application', {
  key: ApplicationKey,
  Model: Schema.Struct({
    catalog: CatalogQueryBlock.Model,
    fruitListbox: FruitListboxBlock.Model,
    selectedFruit: Fruit,
  }),
  Message,
  Init: Schema.Tuple([]),
  effects: { services: [Catalog] },
  view: { kind: 'Element' },
})
