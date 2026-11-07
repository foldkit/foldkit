import type { Block } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import {
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'

export const DialogBinding = makeRequiredFieldBinding(Dialog.DialogBlock, {
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
