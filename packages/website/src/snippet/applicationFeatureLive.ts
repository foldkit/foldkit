import { Layer } from 'effect'

import { LoadProductsLive } from './command'
import { ManageProductPreviewLive } from './managedResource'
import { MeasureProductGridLive } from './mount'
import * as Reviews from './reviews'
import { ProductUpdatesLive } from './subscription'

export const Live = Layer.mergeAll(
  LoadProductsLive,
  ProductUpdatesLive,
  MeasureProductGridLive,
  ManageProductPreviewLive,
  Reviews.Live,
)
