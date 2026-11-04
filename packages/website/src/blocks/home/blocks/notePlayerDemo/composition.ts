import type { Block } from 'foldkit'

import {
  NoteDurationRadioGroupBlock,
  NotePlayerDemoBlock,
  makeFieldsStep,
} from './definition'
import { prependToLog } from './messageLog'

export const NoteDurationRadioGroupBinding = NotePlayerDemoBlock.makeBinding(
  NoteDurationRadioGroupBlock,
  {
    field: 'noteDurationRadioGroup',
    init: { contextToArgs: () => [{ id: 'note-duration' }] },
  },
).withOutMessagePolicy({
  fold: NotePlayerDemoBlock.makeOutMessageFold(NoteDurationRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        noteDuration: () => value,
        messageLog: prependToLog(`Selected(${value})`),
      })),
  }),
})

export const NotePlayerDemoComposition = NotePlayerDemoBlock.makeComposition({
  bindings: [NoteDurationRadioGroupBinding],
})
export type NotePlayerDemoViewBuilder = Block.ViewBuilderFor<
  typeof NotePlayerDemoComposition
>
