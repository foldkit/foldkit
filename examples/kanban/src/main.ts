import { KeyValueStore } from 'effect/unstable/persistence'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Effect, Option, Schema as S } from 'effect'
import { Runtime, Ui } from 'foldkit'

import { DEFAULT_COLUMNS, STORAGE_KEY } from './constant'
import { Message } from './message'
import { Model, SavedBoard } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// FLAGS

const Flags = S.Struct({
  maybeSavedBoard: S.Option(SavedBoard),
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const json = yield* Effect.fromOption(
    Option.fromNullishOr(yield* store.get(STORAGE_KEY)),
  )
  const decoded = yield* S.decodeEffect(S.fromJsonString(SavedBoard))(json)
  return { maybeSavedBoard: Option.some(decoded) } as Flags
}).pipe(
  Effect.catch(() =>
    Effect.succeed({ maybeSavedBoard: Option.none() } as Flags),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

const init: Runtime.ProgramInit<Model, Message, Flags> = flags => {
  const columns = Option.match(flags.maybeSavedBoard, {
    onNone: () => DEFAULT_COLUMNS,
    onSome: ({ columns }) => columns,
  })

  return [
    {
      columns,
      dragAndDrop: Ui.DragAndDrop.init({ id: 'kanban' }),
      maybeNewCardColumnId: Option.none(),
      newCardTitle: '',
      announcement: '',
    },
    [],
  ]
}

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
