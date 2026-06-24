import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { literal, r, schemaSegment, slash } from 'foldkit/route'

// A refinement, not a transform: the value stays a string, but the route only
// matches when the segment is actually a UUID. The brand rides along, so the
// model carries a ProductId distinct from any other string.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ProductId = S.String.check(S.isPattern(UUID_PATTERN)).pipe(
  S.brand('ProductId'),
)
type ProductId = typeof ProductId.Type

const ProductRoute = r('Product', { productId: ProductId })

// Matches /products/<uuid>. /products/banana does not match, so in oneOf it
// falls through to the next route, or to not-found.
const productRouter = pipe(
  literal('products'),
  slash(schemaSegment('productId', ProductId)),
  Route.mapTo(ProductRoute),
)

// Building still round-trips: a ProductId prints straight back into the path.
const productUrl = productRouter({
  productId: ProductId.make('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
})
