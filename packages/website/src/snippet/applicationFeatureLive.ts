import { Layer } from 'effect'

import { LoadProductsLive } from './command'
import { ManageProductPreviewLive } from './managedResource'
import { MeasureProductGridLive } from './mount'
import * as Reviews from './reviews'
import { ProductCatalogLive } from './service'
import { ProductUpdatesLive } from './subscription'

const HandlersLive = Layer.mergeAll(
  LoadProductsLive,
  ProductUpdatesLive,
  MeasureProductGridLive,
  ManageProductPreviewLive,
  Reviews.Live,
)

export const Live = Layer.provide(HandlersLive, ProductCatalogLive)
