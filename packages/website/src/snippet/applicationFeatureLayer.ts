import { Layer } from 'effect'

import { LoadProductsLayer } from './command'
import { ManageProductPreviewLayer } from './managedResource'
import { MeasureProductGridLayer } from './mount'
import * as Reviews from './reviews'
import { ProductCatalogLayer } from './service'
import { ProductUpdatesLayer } from './subscription'

const HandlersLayer = Layer.mergeAll(
  LoadProductsLayer,
  ProductUpdatesLayer,
  MeasureProductGridLayer,
  ManageProductPreviewLayer,
  Reviews.layer,
)

export const layer = Layer.provide(HandlersLayer, ProductCatalogLayer)
