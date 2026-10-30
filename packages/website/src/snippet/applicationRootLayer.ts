// services.ts
import { Context, Effect, Layer, Schema } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { Http } from 'foldkit'

const Product = Schema.Struct({ id: Schema.String, name: Schema.String })
type Product = typeof Product.Type

export class ProductCatalog extends Context.Service<
  ProductCatalog,
  Readonly<{ list: Effect.Effect<ReadonlyArray<Product>, string> }>
>()('shop/ProductCatalog') {}

const ProductCatalogLayer = Layer.effect(
  ProductCatalog,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient

    return {
      list: client.get('/api/products').pipe(
        Effect.flatMap(
          HttpClientResponse.schemaBodyJson(Schema.Array(Product)),
        ),
        Effect.mapError(() => 'Could not load products'),
      ),
    }
  }),
)

export const ApplicationLayer = ProductCatalogLayer.pipe(
  Layer.provide(Http.layer),
)

export const ApplicationTestLayer = Layer.succeed(ProductCatalog, {
  list: Effect.succeed([{ id: 'lamp', name: 'Desk lamp' }]),
})
