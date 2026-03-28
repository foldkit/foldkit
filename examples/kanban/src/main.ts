import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Array, Effect, Option, Schema as S, pipe } from 'effect'
import { Runtime, Ui } from 'foldkit'

import { DEFAULT_COLUMNS, STORAGE_KEY } from './constant'
import type { Message } from './message'
import { Model, SavedBoard } from './model'
import { subscriptions } from './subscription'
import { update } from './update'
import { view } from './view'

// FLAGS

const Flags = S.Struct({
  maybeSavedBoard: S.OptionFromSelf(SavedBoard),
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeJson = yield* store.get(STORAGE_KEY)
  const json = yield* maybeJson
  const decoded = yield* S.decode(S.parseJson(SavedBoard))(json)
  return { maybeSavedBoard: Option.some(decoded) }
}).pipe(
  Effect.catchAll(() => Effect.succeed({ maybeSavedBoard: Option.none() })),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// INIT

const INITIAL_NEXT_CARD_ID = 100

const CARD_ID_PREFIX = 'card-'

const deriveNextCardId = (
  columns: ReadonlyArray<{
    readonly cards: ReadonlyArray<{ readonly id: string }>
  }>,
): number =>
  pipe(
    columns,
    Array.flatMap(({ cards }) => cards),
    Array.filterMap(({ id }) =>
      Option.flatMap(
        id.startsWith(CARD_ID_PREFIX)
          ? Option.some(id.slice(CARD_ID_PREFIX.length))
          : Option.none(),
        suffix => {
          const parsed = Number(suffix)
          return Number.isNaN(parsed) ? Option.none() : Option.some(parsed)
        },
      ),
    ),
    Array.match({
      onEmpty: () => INITIAL_NEXT_CARD_ID,
      onNonEmpty: ids => Math.max(...ids) + 1,
    }),
    nextId => Math.max(nextId, INITIAL_NEXT_CARD_ID),
  )

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
      nextCardId: deriveNextCardId(columns),
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
})

Runtime.run(program)
