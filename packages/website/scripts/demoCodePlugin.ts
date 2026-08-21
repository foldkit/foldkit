import { codeToHtml } from 'shiki'
import type { Plugin } from 'vite'

import { shikiDarkTheme, shikiLightTheme } from '../src/shikiTheme'

const shikiThemes = {
  light: shikiLightTheme,
  dark: shikiDarkTheme,
}

/** A run of snippet lines a demo phase highlights, addressed by exact line
 *  text rather than line number. `to` is the first matching line at or after
 *  `from`; omit it for a single-line region. */
export type PhaseRegion = Readonly<{ from: string; to?: string }>

/** The lines each phase highlights, keyed by the phase name the panel sets on
 *  its `data-*-phase` attribute. */
export type PhaseRegions = Readonly<Record<string, ReadonlyArray<PhaseRegion>>>

const regionLineNumbers = (
  bodyLines: ReadonlyArray<string>,
  phase: string,
  region: PhaseRegion,
): ReadonlyArray<number> => {
  const fromIndex = bodyLines.indexOf(region.from)
  if (fromIndex === -1) {
    throw new Error(
      `Demo phase "${phase}" anchors on a line that is not in the snippet:\n  ${region.from}`,
    )
  }

  if (region.to === undefined) {
    return [fromIndex + 1]
  }

  const toOffset = bodyLines.slice(fromIndex).indexOf(region.to)
  if (toOffset === -1) {
    throw new Error(
      `Demo phase "${phase}" never closes. No line after its start matches:\n  ${region.to}`,
    )
  }

  const toIndex = fromIndex + toOffset
  return Array.from(
    { length: toIndex - fromIndex + 1 },
    (_, i) => fromIndex + 1 + i,
  )
}

const phaseTokensByLine = (
  bodyLines: ReadonlyArray<string>,
  phaseRegions: PhaseRegions,
): ReadonlyArray<string> => {
  const tokens: Array<Array<string>> = bodyLines.map(() => [])

  Object.entries(phaseRegions).forEach(([phase, regions]) => {
    regions.forEach(region => {
      regionLineNumbers(bodyLines, phase, region).forEach(lineNumber => {
        tokens[lineNumber - 1]!.push(phase)
      })
    })
  })

  return tokens.map(phases => phases.join(' '))
}

const demoCodeToHtml = async (
  importsCode: string,
  bodyCode: string,
  phaseRegions: PhaseRegions,
): Promise<string> => {
  const importLines = importsCode.trimEnd().split('\n')
  const bodyLines = bodyCode.trimEnd().split('\n')
  const lines = [...importLines, '', ...bodyLines]
  const lineDigits = String(bodyLines.length).length
  const tokens = phaseTokensByLine(bodyLines, phaseRegions)

  const html = await codeToHtml(lines.join('\n'), {
    lang: 'typescript',
    themes: shikiThemes,
    decorations: bodyLines.map((line, index) => ({
      start: { line: importLines.length + 1 + index, character: 0 },
      end: { line: importLines.length + 1 + index, character: line.length },
      properties: { 'data-line': index + 1, 'data-phases': tokens[index]! },
    })),
  })

  return html.replace('<pre ', `<pre data-line-digits="${lineDigits}" `)
}

const demoCodePlugin = (
  name: string,
  virtualId: string,
  importsCode: string,
  bodyCode: string,
  phaseRegions: PhaseRegions,
): Plugin => {
  const resolvedVirtualId = '\0' + virtualId

  return {
    name,
    resolveId(id) {
      if (id === virtualId) {
        return resolvedVirtualId
      } else {
        return undefined
      }
    },
    async load(id) {
      if (id !== resolvedVirtualId) {
        return undefined
      }

      const html = await demoCodeToHtml(importsCode, bodyCode, phaseRegions)

      return `export default ${JSON.stringify(html)}`
    },
  }
}

const COUNTER_DEMO_CODE_ID = 'virtual:counter-demo-code'

const DEMO_IMPORTS = `import { Effect, Schema as S } from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'`

const DEMO_CODE = `// MODEL

const Model = S.Struct({
  count: S.Number,
  isResetting: S.Boolean,
  resetDuration: S.Number,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedIncrement: {},
  ChangedResetDuration: { seconds: S.Number },
  ClickedResetAfterDelay: {},
  CompletedDelayReset: {},
})
type Message = typeof Message.Type

// COMMAND

const DelayReset = Command.define('DelayReset', {
  args: { seconds: S.Number },
  messages: [Message.CompletedDelayReset],
  execute: ({ seconds }) =>
    Effect.as(
      Effect.sleep(\`\${seconds} seconds\`),
      Message.CompletedDelayReset(),
    ),
})

// UPDATE

type UpdateReturn = Update.Return<Model, Message>
const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedIncrement: () => ({
      model: evo(model, { count: count => count + 1 }),
    }),
    ChangedResetDuration: ({ seconds }) => ({
      model: evo(model, { resetDuration: () => seconds }),
    }),
    ClickedResetAfterDelay: () => ({
      model: evo(model, { isResetting: () => true }),
      commands: [DelayReset({ seconds: model.resetDuration })],
    }),
    CompletedDelayReset: () => ({
      model: evo(model, { count: () => 0, isResetting: () => false }),
    }),
  })`

const COUNTER_PHASE_REGIONS: PhaseRegions = {
  IncrementMessage: [{ from: '  ClickedIncrement: {},' }],
  IncrementUpdate: [{ from: '    ClickedIncrement: () => ({', to: '    }),' }],
  IncrementModel: [{ from: 'const Model = S.Struct({', to: '})' }],
  DurationMessage: [
    {
      from: '  ChangedResetDuration: { seconds: S.Number },',
    },
  ],
  DurationUpdate: [
    { from: '    ChangedResetDuration: ({ seconds }) => ({', to: '    }),' },
  ],
  DurationModel: [{ from: '  resetDuration: S.Number,' }],
  ResetMessage: [{ from: '  ClickedResetAfterDelay: {},' }],
  ResetUpdate: [
    { from: '    ClickedResetAfterDelay: () => ({', to: '    }),' },
  ],
  ResetCommand: [
    { from: "const DelayReset = Command.define('DelayReset', {", to: '})' },
    { from: '      commands: [DelayReset({ seconds: model.resetDuration })],' },
  ],
  ResetCommandMessage: [{ from: '  CompletedDelayReset: {},' }],
  ResetCommandUpdate: [
    { from: '    CompletedDelayReset: () => ({', to: '    }),' },
  ],
  ResetModel: [{ from: 'const Model = S.Struct({', to: '})' }],
}

/** Serves the async counter demo source as a virtual module of highlighted HTML. */
export const counterDemoCodePlugin = (): Plugin =>
  demoCodePlugin(
    'counter-demo-code',
    COUNTER_DEMO_CODE_ID,
    DEMO_IMPORTS,
    DEMO_CODE,
    COUNTER_PHASE_REGIONS,
  )

const NOTE_PLAYER_DEMO_CODE_ID = 'virtual:note-player-demo-code'

const NOTE_PLAYER_DEMO_IMPORTS = `import {
  Array,
  Context,
  Effect,
  Layer,
  Match as M,
  Schema as S,
} from 'effect'
import { Command, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'`

const NOTE_PLAYER_DEMO_CODE = `// MODEL

const Note = S.Literals(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
type Note = typeof Note.Type

const Idle = ts('Idle')
const Playing = ts('Playing', { currentNoteIndex: S.Number })
const Paused = ts('Paused', { currentNoteIndex: S.Number })
const PlaybackState = S.Union([Idle, Playing, Paused])

const Model = S.Struct({
  noteSequence: S.Array(Note),
  noteDuration: S.Number,
  playbackState: PlaybackState,
})
type Model = typeof Model.Type

// MESSAGE

const Message = defineMessageUnion({
  ClickedPlay: {},
  ClickedPause: {},
  CompletedPlayNote: { noteIndex: S.Number },
})
type Message = typeof Message.Type

// UPDATE

type UpdateReturn = Update.Return<Model, Message, AudioContextService>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const playNoteAt = (
  model: Model,
  noteIndex: number,
): UpdateReturn => ({
  model: evo(model, {
    playbackState: () => Playing({ currentNoteIndex: noteIndex }),
  }),
  commands: [
    PlayNote({
      note: Array.getUnsafe(model.noteSequence, noteIndex),
      duration: model.noteDuration,
      noteIndex,
    }),
  ],
})

const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedPlay: () =>
      M.value(model.playbackState).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Idle: () => playNoteAt(model, 0),
          Paused: ({ currentNoteIndex }) =>
            playNoteAt(model, currentNoteIndex),
          Playing: () => ({ model }),
        }),
      ),
    ClickedPause: () =>
      M.value(model.playbackState).pipe(
        withUpdateReturn,
        M.tagsExhaustive({
          Playing: ({ currentNoteIndex }) => ({
            model: evo(model, {
              playbackState: () => Paused({ currentNoteIndex }),
            }),
          }),
          Idle: () => ({ model }),
          Paused: () => ({ model }),
        }),
      ),
    CompletedPlayNote: ({ noteIndex }) => {
      const { playbackState, noteSequence } = model
      const nextCurrentNoteIndex = noteIndex + 1

      if (playbackState._tag !== 'Playing') {
        return { model }
      } else if (nextCurrentNoteIndex >= noteSequence.length) {
        return { model: evo(model, { playbackState: () => Idle() }) }
      } else {
        return playNoteAt(model, nextCurrentNoteIndex)
      }
    },
  })

// RESOURCE

class AudioContextService extends Context.Service<
  AudioContextService,
  AudioContext
>()('AudioContextService') {
  static readonly Default = Layer.sync(
    this,
    () => new AudioContext(),
  )
}

// COMMAND

const PlayNote = Command.define('PlayNote', {
  args: { note: Note, duration: S.Number, noteIndex: S.Number },
  messages: [Message.CompletedPlayNote],
  execute: ({ note, duration, noteIndex }) =>
    Effect.gen(function* () {
      const audioContext = yield* AudioContextService

      return yield* Effect.callback(resume => {
        const oscillator = audioContext.createOscillator()
        oscillator.frequency.setValueAtTime(
          NOTE_FREQUENCIES[note],
          audioContext.currentTime,
        )
        oscillator.connect(audioContext.destination)
        oscillator.start()
        oscillator.stop(audioContext.currentTime + duration)
        oscillator.onended = () =>
          resume(Effect.succeed(Message.CompletedPlayNote({ noteIndex })))
      })
    }),
})`

const NOTE_PLAYER_PHASE_REGIONS: PhaseRegions = {
  PlayMessage: [{ from: '  ClickedPlay: {},' }],
  PauseMessage: [{ from: '  ClickedPause: {},' }],
  PlayUpdate: [
    { from: '    ClickedPlay: () =>', to: '      ),' },
    { from: 'const playNoteAt = (', to: '})' },
  ],
  PlayModel: [{ from: 'const Model = S.Struct({', to: '})' }],
  NoteMessage: [{ from: '  CompletedPlayNote: { noteIndex: S.Number },' }],
  NoteUpdate: [
    { from: '    CompletedPlayNote: ({ noteIndex }) => {', to: '    },' },
    { from: 'const playNoteAt = (', to: '})' },
  ],
  NoteModel: [{ from: 'const Model = S.Struct({', to: '})' }],
  NoteCommand: [
    { from: "const PlayNote = Command.define('PlayNote', {", to: '})' },
  ],
}

/** Serves the note player demo source as a virtual module of highlighted HTML. */
export const notePlayerDemoCodePlugin = (): Plugin =>
  demoCodePlugin(
    'note-player-demo-code',
    NOTE_PLAYER_DEMO_CODE_ID,
    NOTE_PLAYER_DEMO_IMPORTS,
    NOTE_PLAYER_DEMO_CODE,
    NOTE_PLAYER_PHASE_REGIONS,
  )
