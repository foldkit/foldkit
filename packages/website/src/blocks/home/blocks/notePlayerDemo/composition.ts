import type { Block } from 'foldkit'

import {
  NoteDurationRadioGroupBlock,
  makeBinding,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
} from './block'
import { prependToLog } from './messageLog'

export const NoteDurationRadioGroupBinding = makeBinding(
  NoteDurationRadioGroupBlock,
  {
    field: 'noteDurationRadioGroup',
    init: { contextToArgs: () => [{ id: 'note-duration' }] },
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(NoteDurationRadioGroupBlock, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        noteDuration: () => value,
        messageLog: prependToLog(`Selected(${value})`),
      })),
  }),
})

export const NotePlayerDemoComposition = makeComposition({
  bindings: [NoteDurationRadioGroupBinding],
})
export type NotePlayerDemoViewBuilder = Block.ViewBuilderFor<
  typeof NotePlayerDemoComposition
>
