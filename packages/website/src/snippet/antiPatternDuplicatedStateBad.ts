// ❌ Bad: visibleItems can stop matching items and query.

import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Item = Schema.Struct({ id: Schema.String, name: Schema.String })

export class Catalog extends Block<Catalog>()('Catalog', {
  Model: Schema.Struct({
    items: Schema.Array(Item),
    query: Schema.String,
    visibleItems: Schema.Array(Item),
  }),
  Message: defineMessageUnion({ UpdatedQuery: { query: Schema.String } }),
}) {}

export const CatalogLive = Catalog.make(
  Effect.fn(function* () {
    return {
      model: { items: [], query: '', visibleItems: [] },

      update: {
        UpdatedQuery: (model, { query }) => ({
          model: modifyFields(model, { query: () => query }),
        }),
      },
    }
  }),
)
