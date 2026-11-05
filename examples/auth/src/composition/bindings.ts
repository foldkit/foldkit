import { makeVariantBinding } from 'foldkit/variantBinding'

import { ApplicationBlock } from '../block'
import { LoggedInBlock, LoggedOutBlock } from '../blocks'

export const BaseLoggedInBinding = makeVariantBinding(
  ApplicationBlock,
  LoggedInBlock,
)

export const BaseLoggedOutBinding = makeVariantBinding(
  ApplicationBlock,
  LoggedOutBlock,
)
