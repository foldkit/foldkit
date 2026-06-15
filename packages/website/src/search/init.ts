import { Dialog } from '@foldkit/ui'
import { Command } from 'foldkit'

import type { Message } from './message'
import type { Model } from './model'
import { Idle } from './model'

export type InitReturn = [Model, ReadonlyArray<Command.Command<Message>>]

export const init = (): InitReturn => [
  {
    dialog: Dialog.init({ id: 'search-dialog' }),
    query: '',
    searchState: Idle(),
    activeResultIndex: -1,
  },
  [],
]
