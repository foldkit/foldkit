import { CommandPaletteComposition } from './composition'
import { closeDialog, openPalette } from './steps'

export const inMessageUpdate = CommandPaletteComposition.makeInMessageUpdate({
  RequestedOpen: openPalette,
  RequestedClose: closeDialog,
})
