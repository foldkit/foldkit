import type { Block } from 'foldkit'

import { DialogBlock } from '@foldkit/ui'

import { CommandPaletteDefinition } from './definition'

export const DialogBinding = CommandPaletteDefinition.makeBinding(DialogBlock, {
  field: 'dialog',
  init: {
    contextToArgs: () => [{ id: 'workspace-command-palette' }],
  },
}).withOutMessagePolicy({
  fold: CommandPaletteDefinition.makeOutMessageFold(DialogBlock, {
    Opened: CommandPaletteDefinition.makeNoopStep,
    Closed: () =>
      CommandPaletteDefinition.makeFieldsStep(() => ({
        query: () => '',
        activeResultIndex: () => 0,
      })),
    CompletedClose: CommandPaletteDefinition.makeNoopStep,
  }),
})

export const CommandPaletteComposition =
  CommandPaletteDefinition.makeComposition({
    bindings: [DialogBinding],
  })
export type CommandPaletteViewBuilder = Block.ViewBuilderFor<
  typeof CommandPaletteComposition
>
