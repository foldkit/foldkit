import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Message } from './message'
import { Model } from './model'
import { type ViewInput, view } from './view'

export class BlockPage extends Block<BlockPage, void, ViewInput>()(
  'BlockPage',
  { Model, Message },
) {}

export const BlockPageLive = BlockPage.toLayer(() => ({
  init: () => ({ isMessageRoutingUnderHoodOpen: false }),

  update: {
    ToggledMessageRoutingUnderHood: (model, { isOpen }) => ({
      model: modifyFields(model, {
        isMessageRoutingUnderHoodOpen: () => isOpen,
      }),
    }),
  },

  view,
}))
