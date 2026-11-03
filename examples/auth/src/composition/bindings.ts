import { makeVariantBinding } from 'foldkit/variantBinding'

import { LoggedInBlock, LoggedOutBlock } from '../blocks'
import { ApplicationDefinition } from '../definition'

export const loggedInBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedInBlock,
)

export const loggedOutBinding = makeVariantBinding(
  ApplicationDefinition,
  LoggedOutBlock,
)
