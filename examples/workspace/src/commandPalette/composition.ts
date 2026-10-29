import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui'

import {
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} from './definition'

export const DialogBinding = makeBinding(DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'workspace-command-palette' }],
  },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
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
