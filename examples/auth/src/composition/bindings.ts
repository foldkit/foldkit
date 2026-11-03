import { makeVariantBinding } from 'foldkit/variantBinding'

import { LoggedInBlock, LoggedOutBlock } from '../blocks'
import { ApplicationDefinition } from '../definition'

export const BaseLoggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
)

export const BaseLoggedOutBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedOutBlock,
)
