import { type Update } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import type { Message } from './message'
import type { Model } from './model'
import { Idle } from './model'

export type InitReturn = Update.Return<Model, Message>

export const init = (): InitReturn => ({
  model: {
    dialog: Dialog.init({ id: 'search-dialog' }),
    query: '',
    searchState: Idle(),
    activeResultIndex: -1,
  },
})
