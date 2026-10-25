import { BlockPageComposition } from './composition'
import { BlockPageDefinition } from './definition'

export const update = BlockPageComposition.makeUpdate({
  ToggledMapMessagesUnderHood: BlockPageDefinition.makeFieldsStep.fromMessage(
    ({ isOpen }) => ({ isMapMessagesUnderHoodOpen: () => isOpen }),
  ),
})
