import { Update } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import type { Message } from './message'
import type { Model } from './model'
import { SearchState } from './model'

export type InitReturn = Update.Return<Model, Message>

export const init = (): InitReturn => ({
  model: {
    dialog: Dialog.init({ id: 'search-dialog' }),
    query: '',
    searchState: SearchState.Idle(),
    activeResultIndex: -1,
  },
})
