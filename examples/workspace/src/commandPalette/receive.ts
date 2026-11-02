import { CommandPaletteComposition } from './composition'
import { closeDialog, openPalette } from './steps'

export const receive = CommandPaletteComposition.makeReceive({
  RequestedOpen: openPalette,
  RequestedClose: closeDialog,
})
