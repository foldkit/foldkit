import { makeBinding, makeComposition } from './block'
import * as Composer from './composer'

export const PrimaryComposerBinding = makeBinding(Composer.ComposerBlock, {
  field: 'primaryComposer',
})

export const SecondaryComposerBinding = makeBinding(Composer.ComposerBlock, {
  field: 'secondaryComposer',
})

export const ChatComposition = makeComposition({
  bindings: [PrimaryComposerBinding, SecondaryComposerBinding],
})
