import { makeFieldsStep } from './block'
import { BlockPageComposition } from './composition'

export const update = BlockPageComposition.makeUpdate({
  ToggledMapMessagesUnderHood: makeFieldsStep.fromMessage(({ isOpen }) => ({
    isMapMessagesUnderHoodOpen: () => isOpen,
  })),
})
