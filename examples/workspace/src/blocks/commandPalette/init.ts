import { CommandPaletteComposition } from './composition'

export const init = CommandPaletteComposition.makeInit(() => ({
  model: { query: '', activeResultIndex: 0 },
}))
