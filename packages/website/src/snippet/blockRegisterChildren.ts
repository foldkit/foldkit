import { makeRequiredFieldBinding, makeComposition } from './block'
import * as Composer from './composer'

export const PrimaryComposerBinding = makeRequiredFieldBinding(
  Composer.ComposerBlock,
  {
    field: 'primaryComposer',
  },
)

export const SecondaryComposerBinding = makeRequiredFieldBinding(
  Composer.ComposerBlock,
  {
    field: 'secondaryComposer',
  },
)

export const ChatComposition = makeComposition({
  bindings: [PrimaryComposerBinding, SecondaryComposerBinding],
})
