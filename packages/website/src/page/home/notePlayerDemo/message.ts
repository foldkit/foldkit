import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ChangedNoteInput: { value: Schema.String },
  ClickedPlay: {},
  ClickedPause: {},
  ClickedStop: {},
  CompletedPlayNote: { noteIndex: Schema.Number },
  CompletedDelayAdvanceNotePlayerPhase: { generation: Schema.Number },
  SucceededAcquireAudioContext: {},
  FailedAcquireAudioContext: {},
})
export type Message = typeof Message.Type
export type CompletedPlayNote = typeof Message.CompletedPlayNote.Type
