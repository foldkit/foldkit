import { Command, Ui } from 'foldkit'

import type { Message } from './message'
import type { Model } from './model'
import { Idle } from './model'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    dialog: Ui.Dialog.init({ id: 'search-dialog' }),
    query: '',
    searchState: Idle(),
    activeResultIndex: -1,
  },
  [],
]
