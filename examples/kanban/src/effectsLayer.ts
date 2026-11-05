import { Layer } from 'effect'

import { FocusAddCardInput, GenerateCardId, SaveBoard } from './command'

export const EffectsLayer = Layer.mergeAll(
  GenerateCardId.layer,
  SaveBoard.layer,
  FocusAddCardInput.layer,
)
