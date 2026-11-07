import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { makeCustomBinding } from './block'
import * as Composer from './composer'
import { Message } from './message'

export const PrimaryComposerBinding = makeCustomBinding(
  Composer.ComposerBlock,
  {
    read: model => Option.some(model.primaryPanel.composer),
    write: (model, nextComposer) =>
      modifyFields(model, {
        primaryPanel: panel =>
          modifyFields(panel, { composer: () => nextComposer }),
      }),
  },
)

export const SecondaryComposerBinding = makeCustomBinding(
  Composer.ComposerBlock,
  {
    placement: 'SecondaryComposer',
    read: model => Option.some(model.secondaryPanel.composer),
    write: (model, nextComposer) =>
      modifyFields(model, {
        secondaryPanel: panel =>
          modifyFields(panel, { composer: () => nextComposer }),
      }),
  },
)
