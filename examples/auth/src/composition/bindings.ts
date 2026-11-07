import { ApplicationBlock } from '../block'
import { LoggedInBlock, LoggedOutBlock } from '../blocks'

export const BaseLoggedInBinding =
  ApplicationBlock.makeVariantBinding(LoggedInBlock)

export const BaseLoggedOutBinding =
  ApplicationBlock.makeVariantBinding(LoggedOutBlock)
