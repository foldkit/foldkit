import { Tuple } from 'effect'
import type { Block } from 'foldkit'

import {
  NoteDurationRadioGroupBlock,
  NotePlayerDemoDefinition,
  makeFieldsStep,
} from './definition'
import { prependToLog } from './messageLog'

export const NoteDurationRadioGroupBinding =
  NotePlayerDemoDefinition.makeBinding(NoteDurationRadioGroupBlock, {
    field: 'noteDurationRadioGroup',
    init: { contextToArgs: () => Tuple.make({ id: 'note-duration' }) },
  }).withOutMessagePolicy({
    fold: NotePlayerDemoDefinition.makeOutMessageFold(
      NoteDurationRadioGroupBlock,
      {
        Selected: ({ value }) =>
          makeFieldsStep(() => ({
            noteDuration: () => value,
            messageLog: prependToLog(`Selected(${value})`),
          })),
      },
    ),
  })

export const NotePlayerDemoComposition =
  NotePlayerDemoDefinition.makeComposition({
    bindings: [NoteDurationRadioGroupBinding],
  })
export type NotePlayerDemoViewBuilder = Block.ViewBuilderFor<
  typeof NotePlayerDemoComposition
>
