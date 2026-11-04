import * as Composer from './composer'
import { ChatBlock } from './definition'

export const PrimaryComposerBinding = ChatBlock.makeBinding(
  Composer.ComposerBlock,
  {
    field: 'primaryComposer',
  },
)

export const SecondaryComposerBinding = ChatBlock.makeBinding(
  Composer.ComposerBlock,
  {
    field: 'secondaryComposer',
  },
)

export const ChatComposition = ChatBlock.makeComposition({
  bindings: [PrimaryComposerBinding, SecondaryComposerBinding],
})
