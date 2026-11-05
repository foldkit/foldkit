import { makeOutMessageStep } from './block'
import { OutMessage } from './outMessage'

export const clearFilters = makeOutMessageStep(() =>
  OutMessage.RequestedClearFilters(),
)
