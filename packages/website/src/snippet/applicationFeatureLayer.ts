import { Layer as EffectLayer } from 'effect'

import { LoadProductsLayer } from './command'
import { ManageProductPreviewLayer } from './managedResource'
import { MeasureProductGridLayer } from './mount'
import * as Reviews from './reviews'
import { ProductCatalogLayer } from './service'
import { ProductUpdatesLayer } from './subscription'

const HandlersLayer = EffectLayer.mergeAll(
  LoadProductsLayer,
  ProductUpdatesLayer,
  MeasureProductGridLayer,
  ManageProductPreviewLayer,
  Reviews.Layer,
)

export const Layer = EffectLayer.provide(HandlersLayer, ProductCatalogLayer)
