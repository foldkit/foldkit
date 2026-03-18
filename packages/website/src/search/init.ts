import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'

import type { Message } from './message'
import type { Model } from './model'
import { Idle } from './model'

export type InitReturn = [Model, ReadonlyArray<Command<Message>>]

export const init = (): InitReturn => [
  {
    dialog: Ui.Dialog.init({ id: 'search-dialog' }),
    query: '',
    searchState: Idle(),
    activeResultIndex: -1,
  },
  [],
]
