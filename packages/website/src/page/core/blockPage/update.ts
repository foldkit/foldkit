import { BlockPageComposition } from './composition'
import { makeFieldsStep } from './definition'

export const update = BlockPageComposition.makeUpdate({
  ToggledMapMessagesUnderHood: makeFieldsStep.fromMessage(({ isOpen }) => ({
    isMapMessagesUnderHoodOpen: () => isOpen,
  })),
})
