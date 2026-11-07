import type { Block } from 'foldkit'

import {
  NoteDurationRadioGroupBlock,
  makeComposition,
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
} from './block'
import { prependToLog } from './messageLog'

export const NoteDurationRadioGroupBinding = makeRequiredFieldBinding(
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
