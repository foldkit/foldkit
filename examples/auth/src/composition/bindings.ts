import { makeVariantBinding } from 'foldkit/variantBinding'

import { LoggedInBlock, LoggedOutBlock } from '../blocks'
import { ApplicationBlock } from '../definition'

export const BaseLoggedInBinding = makeVariantBinding(
  ApplicationBlock,
  LoggedInBlock,
)

export const BaseLoggedOutBinding = makeVariantBinding(
  ApplicationBlock,
  LoggedOutBlock,
)
