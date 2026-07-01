import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Command from '../../command/public.js'
import { m, ts } from '../../schema/index.js'
import { defineMachine, to, when } from '../statechart.js'

// STATE

const Viewing = ts('Viewing', { savedText: S.String })
const Editing = ts('Editing', { savedText: S.String, draft: S.String })
const Saving = ts('Saving', {
  savedText: S.String,
  draft: S.String,
  attempt: S.Number,
})
const SaveFailed = ts('SaveFailed', {
  savedText: S.String,
  draft: S.String,
  attempt: S.Number,
  reason: S.String,
})

const EditorState = S.Union([Viewing, Editing, Saving, SaveFailed])
type EditorState = typeof EditorState.Type

// MESSAGE

const StartedEditing = m('StartedEditing')
const ChangedDraft = m('ChangedDraft', { draft: S.String })
const ClickedSave = m('ClickedSave')
const ClickedCancel = m('ClickedCancel')
const ClickedRetry = m('ClickedRetry')
const SucceededSave = m('SucceededSave', { attempt: S.Number })
const FailedSave = m('FailedSave', { attempt: S.Number, reason: S.String })

const EditorMessage = S.Union([
  StartedEditing,
  ChangedDraft,
  ClickedSave,
  ClickedCancel,
  ClickedRetry,
  SucceededSave,
  FailedSave,
])
type EditorMessage = typeof EditorMessage.Type

// COMMAND

const SaveDraft = Command.define(
  'SaveDraft',
  { draft: S.String, attempt: S.Number },
  SucceededSave,
  FailedSave,
)(({ attempt }) => Effect.succeed(SucceededSave({ attempt })))

// MACHINE

const editorMachine = defineMachine({
  state: EditorState,
  message: EditorMessage,
})({
  initial: Viewing({ savedText: '' }),
  states: {
    Viewing: {
      on: {
        StartedEditing: to('Editing', state =>
          Editing({ savedText: state.savedText, draft: state.savedText }),
        ),
      },
    },
    Editing: {
      on: {
        ChangedDraft: to('Editing', (state, message) =>
          Editing({ savedText: state.savedText, draft: message.draft }),
        ),
        ClickedCancel: to('Viewing', state =>
          Viewing({ savedText: state.savedText }),
        ),
        ClickedSave: to(
          'Saving',
          state =>
            Saving({
              savedText: state.savedText,
              draft: state.draft,
              attempt: 1,
            }),
          state => [SaveDraft({ draft: state.draft, attempt: 1 })],
        ),
      },
    },
    Saving: {
      on: {
        SucceededSave: [
          when(
            (state, message) => message.attempt === state.attempt,
            to('Viewing', state => Viewing({ savedText: state.draft })),
          ),
        ],
        FailedSave: [
          when(
            (state, message) => message.attempt === state.attempt,
            to('SaveFailed', (state, message) =>
              SaveFailed({
                savedText: state.savedText,
                draft: state.draft,
                attempt: state.attempt,
                reason: message.reason,
              }),
            ),
          ),
        ],
      },
    },
    SaveFailed: {
      on: {
        ClickedRetry: to(
          'Saving',
          state =>
            Saving({
              savedText: state.savedText,
              draft: state.draft,
              attempt: state.attempt + 1,
            }),
          state => [
            SaveDraft({ draft: state.draft, attempt: state.attempt + 1 }),
          ],
        ),
        ClickedCancel: to('Viewing', state =>
          Viewing({ savedText: state.savedText }),
        ),
      },
    },
  },
})

// TESTS

describe('stale async pruning', () => {
  it('saves the draft on the happy path', () => {
    const [saving, commands] = editorMachine.transition(
      Editing({ savedText: 'old', draft: 'new' }),
      ClickedSave(),
    )
    expect(saving).toStrictEqual(
      Saving({ savedText: 'old', draft: 'new', attempt: 1 }),
    )
    expect(commands.map(command => command.name)).toEqual(['SaveDraft'])

    const [viewing] = editorMachine.transition(
      saving,
      SucceededSave({ attempt: 1 }),
    )
    expect(viewing).toStrictEqual(Viewing({ savedText: 'new' }))
  })

  it('drops a success that arrives after the user cancelled', () => {
    const viewing = Viewing({ savedText: 'old' })
    const result = editorMachine.step(viewing, SucceededSave({ attempt: 1 }))

    expect(result).toEqual({
      _tag: 'Ignored',
      stateTag: 'Viewing',
      messageTag: 'SucceededSave',
      state: viewing,
    })
  })

  it('drops a success from a superseded attempt while a retry is in flight', () => {
    const saving = Saving({ savedText: 'old', draft: 'new', attempt: 2 })

    const staleResult = editorMachine.step(
      saving,
      SucceededSave({ attempt: 1 }),
    )
    expect(staleResult._tag).toBe('Ignored')

    const [viewing] = editorMachine.transition(
      saving,
      SucceededSave({ attempt: 2 }),
    )
    expect(viewing).toStrictEqual(Viewing({ savedText: 'new' }))
  })

  it('routes a failure into retry with an incremented attempt', () => {
    const [failed] = editorMachine.transition(
      Saving({ savedText: 'old', draft: 'new', attempt: 1 }),
      FailedSave({ attempt: 1, reason: 'offline' }),
    )
    expect(failed).toStrictEqual(
      SaveFailed({
        savedText: 'old',
        draft: 'new',
        attempt: 1,
        reason: 'offline',
      }),
    )

    const [retrying, commands] = editorMachine.transition(
      failed,
      ClickedRetry(),
    )
    expect(retrying).toStrictEqual(
      Saving({ savedText: 'old', draft: 'new', attempt: 2 }),
    )
    expect(commands.map(command => command.args)).toEqual([
      { draft: 'new', attempt: 2 },
    ])
  })

  it('drops edits that arrive while a save is in flight', () => {
    const saving = Saving({ savedText: 'old', draft: 'new', attempt: 1 })
    const result = editorMachine.step(saving, ChangedDraft({ draft: 'newer' }))
    expect(result._tag).toBe('Ignored')
  })
})
