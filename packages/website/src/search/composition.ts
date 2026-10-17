import { Tuple } from 'effect'
import type { Block } from 'foldkit'
import { Update } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import { Search } from './definition'
import { Message } from './message'
import { Model } from './model'

const foldDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

export const DialogBinding = Search.bindChild(Dialog.block, {
  field: 'dialog',
  parentMessage: Message.GotSearchDialogMessage,
  fromParentMessage: false,
  outMessage: { fold: foldDialogOutMessage },
  init: { args: () => Tuple.make({ id: 'search-dialog' }) },
})

export const SearchComposition = Search.makeComposition({
  childBindings: [DialogBinding],
})
export type SearchViewBuilder = Block.ViewBuilderFor<typeof SearchComposition>
