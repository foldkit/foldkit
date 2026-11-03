import { PendingHostBlock } from './block.js'
import { HostHandlers } from './provider.js'

export const SelectedHostBlock = PendingHostBlock.provideHandlers(HostHandlers)
export const layer = SelectedHostBlock.layer
