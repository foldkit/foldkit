import { AudioState, PlaybackState } from './block'
import { NotePlayerDemoComposition } from './composition'
import { INITIAL_NOTE_SEQUENCE, validateNoteInput } from './noteInput'

export const init = NotePlayerDemoComposition.makeInit(() => ({
  model: {
    noteInput: validateNoteInput(INITIAL_NOTE_SEQUENCE),
    noteDuration: 'Medium',
    playbackState: PlaybackState.Idle(),
    highlightPhase: 'Idle',
    generation: 0,
    messageLog: [],
    audio: AudioState.Acquiring(),
  },
}))
