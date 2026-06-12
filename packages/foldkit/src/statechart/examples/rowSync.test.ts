import { Array, Effect, Match as M, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Command from '../../command/public.js'
import { m, ts } from '../../schema/index.js'
import { evo } from '../../struct/index.js'
import { defineMachine, to } from '../statechart.js'

// STATE

const Synced = ts('Synced', { value: S.String })
const Editing = ts('Editing', { baseline: S.String, draft: S.String })
const Saving = ts('Saving', { baseline: S.String, draft: S.String })
const Conflict = ts('Conflict', { draft: S.String, serverValue: S.String })

const RowSyncState = S.Union([Synced, Editing, Saving, Conflict])
type RowSyncState = typeof RowSyncState.Type

// MESSAGE

const StartedEditing = m('StartedEditing')
const ChangedDraft = m('ChangedDraft', { draft: S.String })
const ClickedSave = m('ClickedSave')
const SucceededSave = m('SucceededSave')
const FailedSaveConflict = m('FailedSaveConflict', { serverValue: S.String })
const ClickedKeepMine = m('ClickedKeepMine')
const ClickedTakeTheirs = m('ClickedTakeTheirs')

const RowSyncMessage = S.Union([
  StartedEditing,
  ChangedDraft,
  ClickedSave,
  SucceededSave,
  FailedSaveConflict,
  ClickedKeepMine,
  ClickedTakeTheirs,
])
type RowSyncMessage = typeof RowSyncMessage.Type

// COMMAND

const SaveRow = Command.define(
  'SaveRow',
  { draft: S.String },
  SucceededSave,
  FailedSaveConflict,
)(() => Effect.succeed(SucceededSave()))

// MACHINE

const rowSyncMachine = defineMachine({
  state: RowSyncState,
  message: RowSyncMessage,
})({
  initial: Synced({ value: '' }),
  states: {
    Synced: {
      on: {
        StartedEditing: to('Editing', state =>
          Editing({ baseline: state.value, draft: state.value }),
        ),
      },
    },
    Editing: {
      on: {
        ChangedDraft: to('Editing', (state, message) =>
          Editing({ baseline: state.baseline, draft: message.draft }),
        ),
        ClickedSave: to(
          'Saving',
          state => Saving({ baseline: state.baseline, draft: state.draft }),
          state => [SaveRow({ draft: state.draft })],
        ),
      },
    },
    Saving: {
      on: {
        SucceededSave: to('Synced', state => Synced({ value: state.draft })),
        FailedSaveConflict: to('Conflict', (state, message) =>
          Conflict({ draft: state.draft, serverValue: message.serverValue }),
        ),
      },
    },
    Conflict: {
      on: {
        ClickedKeepMine: to(
          'Saving',
          state => Saving({ baseline: state.serverValue, draft: state.draft }),
          state => [SaveRow({ draft: state.draft })],
        ),
        ClickedTakeTheirs: to('Synced', state =>
          Synced({ value: state.serverValue }),
        ),
      },
    },
  },
})

// APP

const Row = S.Struct({ id: S.String, sync: RowSyncState })
type Row = typeof Row.Type

const TableModel = S.Struct({ rows: S.Array(Row) })
type TableModel = typeof TableModel.Type

const GotRowMessage = m('GotRowMessage', {
  rowId: S.String,
  message: RowSyncMessage,
})

const TableMessage = S.Union([GotRowMessage])
type TableMessage = typeof TableMessage.Type

type TableUpdateReturn = [
  TableModel,
  ReadonlyArray<Command.Command<TableMessage>>,
]
const withTableUpdateReturn = M.withReturnType<TableUpdateReturn>()

const applyRowMessage = (
  row: Row,
  rowId: string,
  rowMessage: RowSyncMessage,
): [Row, ReadonlyArray<Command.Command<TableMessage>>] => {
  if (row.id !== rowId) {
    return [row, []]
  }

  const [nextSync, commands] = rowSyncMachine.transition(row.sync, rowMessage)

  return [
    evo(row, { sync: () => nextSync }),
    Command.mapMessages(commands, message => GotRowMessage({ rowId, message })),
  ]
}

const update = (model: TableModel, message: TableMessage): TableUpdateReturn =>
  M.value(message).pipe(
    withTableUpdateReturn,
    M.tagsExhaustive({
      GotRowMessage: ({ rowId, message: rowMessage }) => {
        const rowUpdates = Array.map(model.rows, row =>
          applyRowMessage(row, rowId, rowMessage),
        )

        return [
          evo(model, { rows: () => Array.map(rowUpdates, ([row]) => row) }),
          Array.flatMap(rowUpdates, ([_row, rowCommands]) => rowCommands),
        ]
      },
    }),
  )

// TESTS

describe('per row sync machine', () => {
  const model: TableModel = {
    rows: [
      { id: '1', sync: Synced({ value: 'alpha' }) },
      { id: '2', sync: Editing({ baseline: 'beta', draft: 'beta 2' }) },
      { id: '3', sync: Conflict({ draft: 'mine', serverValue: 'theirs' }) },
    ],
  }

  it('transitions only the addressed row and leaves the rest untouched', () => {
    const [nextModel] = update(
      model,
      GotRowMessage({ rowId: '2', message: ClickedSave() }),
    )

    expect(nextModel.rows.map(row => row.sync._tag)).toEqual([
      'Synced',
      'Saving',
      'Conflict',
    ])
    expect(Array.get(nextModel.rows, 0)).toEqual(Array.get(model.rows, 0))
    expect(Array.get(nextModel.rows, 2)).toEqual(Array.get(model.rows, 2))
  })

  it('routes row commands back through the row envelope', () => {
    const [, commands] = update(
      model,
      GotRowMessage({ rowId: '2', message: ClickedSave() }),
    )

    expect(commands.map(command => command.name)).toEqual(['SaveRow'])

    const resultMessages = commands.map(command =>
      Effect.runSync(command.effect),
    )
    expect(resultMessages).toEqual([
      GotRowMessage({ rowId: '2', message: SucceededSave() }),
    ])
  })

  it('ignores a row message that does not apply to that row state', () => {
    const [nextModel, commands] = update(
      model,
      GotRowMessage({ rowId: '1', message: SucceededSave() }),
    )

    expect(nextModel.rows.map(row => row.sync)).toEqual(
      model.rows.map(row => row.sync),
    )
    expect(commands).toEqual([])
  })

  it('resolves a conflict either way', () => {
    const conflict = Conflict({ draft: 'mine', serverValue: 'theirs' })

    const [keptMine, retryCommands] = rowSyncMachine.transition(
      conflict,
      ClickedKeepMine(),
    )
    expect(keptMine).toStrictEqual(
      Saving({ baseline: 'theirs', draft: 'mine' }),
    )
    expect(retryCommands.map(command => command.name)).toEqual(['SaveRow'])

    const [tookTheirs] = rowSyncMachine.transition(
      conflict,
      ClickedTakeTheirs(),
    )
    expect(tookTheirs).toStrictEqual(Synced({ value: 'theirs' }))
  })

  it('amortizes one definition and one analysis across every row', () => {
    expect(rowSyncMachine.stateTags).toEqual([
      'Synced',
      'Editing',
      'Saving',
      'Conflict',
    ])
    expect(rowSyncMachine.unreachableStates()).toEqual([])
    expect(rowSyncMachine.deadTransitions()).toEqual([])
  })
})
