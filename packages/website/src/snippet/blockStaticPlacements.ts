import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { makeBinding } from './block'
import * as Composer from './composer'
import { Message } from './message'

export const PrimaryComposerBinding = makeBinding(Composer.ComposerBlock, {
  read: model => Option.some(model.primaryPanel.composer),
  write: (model, nextComposer) =>
    modifyFields(model, {
      primaryPanel: panel =>
        modifyFields(panel, { composer: () => nextComposer }),
    }),
})

export const SecondaryComposerBinding = makeBinding(Composer.ComposerBlock, {
  placement: 'SecondaryComposer',
  read: model => Option.some(model.secondaryPanel.composer),
  write: (model, nextComposer) =>
    modifyFields(model, {
      secondaryPanel: panel =>
        modifyFields(panel, { composer: () => nextComposer }),
    }),
})
