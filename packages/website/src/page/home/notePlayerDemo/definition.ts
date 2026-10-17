import { Schema } from 'effect'
import { Block, FieldValidation } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

import { RadioGroup } from '@foldkit/ui'

export const Note = Schema.Literals(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
export type Note = typeof Note.Type

export const NoteDuration = Schema.Literals(['Short', 'Medium', 'Long'])
export type NoteDuration = typeof NoteDuration.Type

export const NoteDurationRadioGroup = RadioGroup.create<NoteDuration>()

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
export type NoteHighlightPhase = typeof NoteHighlightPhase.Type

export const AudioState = defineTaggedUnion({
  Acquiring: {},
  Ready: {},
  Unavailable: {},
})
export type AudioState = typeof AudioState.Type

export const Model = Schema.Struct({
  noteInput: FieldValidation.Field(Schema.String),
  noteDurationRadioGroup: NoteDurationRadioGroup.Model,
  noteDuration: NoteDuration,
  playbackState: PlaybackState,
  highlightPhase: NoteHighlightPhase,
  generation: Schema.Number,
  messageLog: Schema.Array(Schema.String),
  audio: AudioState,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ChangedNoteInput: { value: Schema.String },
  GotNoteDurationMessage: { message: NoteDurationRadioGroup.Message },
  ClickedPlay: {},
  ClickedPause: {},
  ClickedStop: {},
  CompletedPlayNote: { noteIndex: Schema.Number },
  CompletedDelayAdvanceNotePlayerPhase: { generation: Schema.Number },
  SucceededAcquireAudioContext: {},
  FailedAcquireAudioContext: {},
  ReleasedAudioContext: {},
})
export type Message = typeof Message.Type

export const NotePlayerDemo = Block.define('NotePlayerDemo', {
  Model,
  Message,
})
