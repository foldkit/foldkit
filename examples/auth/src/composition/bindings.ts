import { makeVariantBinding } from 'foldkit/variantBinding'

import { LoggedInBlock, LoggedOutBlock } from '../blocks'
import { ApplicationDefinition } from '../definition'

export const LoggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
)

export const LoggedOutBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedOutBlock,
)
