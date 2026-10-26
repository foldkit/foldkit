import { Schema } from 'effect'
import { Block, FieldValidation } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { RadioGroup } from '@foldkit/ui'

export const Note = Schema.Literals(['A', 'B', 'C', 'D', 'E', 'F', 'G'])

export const NoteDuration = Schema.Literals(['Short', 'Medium', 'Long'])

export const NoteDurationRadioGroupBlock =
  RadioGroup.create<typeof NoteDuration.Type>()

export const PlaybackState = defineTaggedUnion({
  Idle: {},
  Playing: {
    noteSequence: Schema.Array(Note),
    currentNoteIndex: Schema.Number,
  },
  Paused: { noteSequence: Schema.Array(Note), currentNoteIndex: Schema.Number },
})

export const NoteHighlightPhase = Schema.Literals([
  'Idle',
  'PlayMessage',
  'PlayUpdate',
  'PlayModel',
  'PauseMessage',
  'NoteMessage',
  'NoteUpdate',
  'NoteModel',
  'NoteCommand',
])

export const AudioState = defineTaggedUnion({
  Acquiring: {},
  Ready: {},
  Unavailable: {},
})

export const Model = Schema.Struct({
  noteInput: FieldValidation.Field(Schema.String),
  noteDurationRadioGroup: NoteDurationRadioGroupBlock.Model,
  noteDuration: NoteDuration,
  playbackState: PlaybackState,
  highlightPhase: NoteHighlightPhase,
  generation: Schema.Number,
  messageLog: Schema.Array(Schema.String),
  audio: AudioState,
})

export const Message = defineMessageUnion({
  ChangedNoteInput: { value: Schema.String },
  ClickedPlay: {},
  ClickedPause: {},
  ClickedStop: {},
  CompletedPlayNote: { noteIndex: Schema.Number },
  CompletedDelayAdvanceNotePlayerPhase: { generation: Schema.Number },
  SucceededAcquireAudioContext: {},
  FailedAcquireAudioContext: {},
  ReleasedAudioContext: {},
})

export const NotePlayerDemoDefinition = Block.makeDefinition('NotePlayerDemo', {
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = NotePlayerDemoDefinition
