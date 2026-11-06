import type { Block } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} from './block'

export const DialogBinding = makeBinding(Dialog.DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'workspace-command-palette' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(Dialog.DialogBlock, {
    Opened: makeNoopStep,
    Closed: () =>
      makeFieldsStep(() => ({
        query: () => '',
        activeResultIndex: () => 0,
      })),
    CompletedClose: makeNoopStep,
  }),
})

export const CommandPaletteComposition = makeComposition({
  bindings: [DialogBinding],
})
export type CommandPaletteViewBuilder = Block.ViewBuilderFor<
  typeof CommandPaletteComposition
>
