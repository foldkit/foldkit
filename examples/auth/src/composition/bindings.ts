import { makeVariantBinding } from 'foldkit/variantBinding'

import { ApplicationDefinition } from '../definition'
import { LoggedInBlock, LoggedOutBlock } from '../page'

export const LoggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
)

export const LoggedOutBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedOutBlock,
)
