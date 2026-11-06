import { CommandPaletteComposition } from './composition'
import { closePalette, openPalette } from './steps'

export const inMessageUpdate = CommandPaletteComposition.makeInMessageUpdate({
  RequestedOpen: openPalette,
  RequestedClose: closePalette,
})
