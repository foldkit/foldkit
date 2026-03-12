import { clsx } from 'clsx'
import {
  Array,
  Effect,
  Match,
  Option,
  Schema,
  Stream,
  SubscriptionRef,
  pipe,
} from 'effect'

import type { Command } from '../command'
import { OptionExt } from '../effectExtensions'
import { type Html, html } from '../html'
import { m } from '../message'
import { makeElement } from '../runtime/runtime'
import { makeSubscriptions } from '../runtime/subscription'
import { evo } from '../struct'
import overlayStyles from './overlay.css?inline'
import { type DevtoolsStore, INIT_INDEX, type StoreState } from './store'

// MODEL

const DisplayEntry = Schema.Struct({
  tag: Schema.String,
  commandCount: Schema.Number,
  timestamp: Schema.Number,
})

const Model = Schema.Struct({
  isOpen: Schema.Boolean,
  entries: Schema.Array(DisplayEntry),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
})
type Model = typeof Model.Type

// MESSAGE

const ClickedToggle = m('ClickedToggle')
const ClickedRow = m('ClickedRow', { index: Schema.Number })
const ClickedResume = m('ClickedResume')
const ClickedClear = m('ClickedClear')
const CompletedSideEffect = m('CompletedSideEffect')
const ReceivedStoreUpdate = m('ReceivedStoreUpdate', {
  entries: Schema.Array(DisplayEntry),
  startIndex: Schema.Number,
  isPaused: Schema.Boolean,
  pausedAtIndex: Schema.Number,
})

const Message = Schema.Union(
  ClickedToggle,
  ClickedRow,
  ClickedResume,
  ClickedClear,
  CompletedSideEffect,
  ReceivedStoreUpdate,
)
type Message = typeof Message.Type

// HELPERS

const MILLIS_PER_SECOND = 1000

const formatTimeDelta = (deltaMs: number): string =>
  deltaMs < MILLIS_PER_SECOND
    ? `+${Math.round(deltaMs)}ms`
    : `+${(deltaMs / MILLIS_PER_SECOND).toFixed(1)}s`

const MESSAGE_LIST_SELECTOR = '.message-list'

const toDisplayEntries = ({ entries }: StoreState) =>
  Array.map(entries, ({ tag, commandCount, timestamp }) => ({
    tag,
    commandCount,
    timestamp,
  }))

const toDisplayState = (state: StoreState) => ({
  entries: toDisplayEntries(state),
  startIndex: state.startIndex,
  isPaused: state.isPaused,
  pausedAtIndex: state.pausedAtIndex,
})

// UPDATE

const makeUpdate = (store: DevtoolsStore, shadow: ShadowRoot) => {
  const jumpTo = (index: number): Command<typeof CompletedSideEffect> =>
    Effect.gen(function* () {
      yield* store.jumpTo(index)
      return CompletedSideEffect()
    })

  const resume = Effect.gen(function* () {
    yield* store.resume
    return CompletedSideEffect()
  })

  const clear = Effect.gen(function* () {
    yield* store.clear
    return CompletedSideEffect()
  })

  const scrollToBottom = Effect.sync(() => {
    const messageList = shadow.querySelector(MESSAGE_LIST_SELECTOR)
    if (messageList instanceof HTMLElement) {
      messageList.scrollTop = messageList.scrollHeight
    }
    return CompletedSideEffect()
  })

  return (
    model: Model,
    message: Message,
  ): [Model, ReadonlyArray<Command<Message>>] =>
    Match.value(message).pipe(
      Match.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
      Match.tagsExhaustive({
        ClickedToggle: () => [
          evo(model, {
            isOpen: isOpen => !isOpen,
          }),
          [],
        ],
        ClickedRow: ({ index }) => [model, [jumpTo(index)]],
        ClickedResume: () => [model, [resume]],
        ClickedClear: () => [model, [clear]],
        CompletedSideEffect: () => [model, []],
        ReceivedStoreUpdate: ({
          entries,
          startIndex,
          isPaused,
          pausedAtIndex,
        }) => {
          const maybeScrollToBottom = OptionExt.when(!isPaused, scrollToBottom)

          return [
            evo(model, {
              entries: () => [...entries],
              startIndex: () => startIndex,
              isPaused: () => isPaused,
              pausedAtIndex: () => pausedAtIndex,
            }),
            Option.toArray(maybeScrollToBottom),
          ]
        },
      }),
    )
}

// SUBSCRIPTION

const SubscriptionDeps = Schema.Struct({
  storeUpdates: Schema.Null,
})

const makeOverlaySubscriptions = (store: DevtoolsStore) =>
  makeSubscriptions(SubscriptionDeps)<Model, Message>({
    storeUpdates: {
      modelToDependencies: () => null,
      depsToStream: () =>
        Stream.concat(
          Stream.make(
            pipe(
              SubscriptionRef.get(store.stateRef),
              Effect.map(state => ReceivedStoreUpdate(toDisplayState(state))),
            ),
          ),
          pipe(
            store.stateRef.changes,
            Stream.map(state =>
              Effect.succeed(ReceivedStoreUpdate(toDisplayState(state))),
            ),
          ),
        ),
    },
  })

// VIEW

const indexClass = 'text-2xs text-dt-muted font-mono min-w-7 text-right'

const headerButtonClass =
  'bg-transparent border-none text-dt-muted cursor-pointer text-xs font-sans px-2 py-1 rounded'

const ROW_BASE =
  'flex items-center py-1 px-3 cursor-pointer gap-2 transition-colors border-l-3'

const makeView = (): ((model: Model) => Html) => {
  const { div, span, button, Class, OnClick } = html<Message>()

  const badgeView = (model: Model): Html =>
    button(
      [
        Class(
          clsx(
            'fixed bottom-4 right-4 w-11 h-11 rounded-full bg-dt-bg text-dt cursor-pointer flex items-center justify-center font-mono text-base font-semibold outline-none dt-badge',
            model.isPaused ? 'dt-badge-paused' : 'dt-badge-accent',
          ),
        ),
        OnClick(ClickedToggle()),
      ],
      [String(model.entries.length)],
    )

  const headerView: Html = div(
    [Class('flex items-center justify-between px-3 py-2 border-b shrink-0')],
    [
      span(
        [Class('text-xs font-semibold text-dt-accent font-sans tracking-wide')],
        ['Foldkit'],
      ),
      div(
        [Class('flex gap-0.5')],
        [
          button(
            [Class(headerButtonClass), OnClick(ClickedClear())],
            ['Clear'],
          ),
          button([Class(headerButtonClass), OnClick(ClickedToggle())], ['✕']),
        ],
      ),
    ],
  )

  const initRowView = (isSelected: boolean): Html =>
    div(
      [
        Class(clsx(ROW_BASE, 'border-b', isSelected && 'selected')),
        OnClick(ClickedRow({ index: INIT_INDEX })),
      ],
      [
        span([Class(indexClass)], ['●']),
        span([Class('text-xs text-dt-muted font-mono italic')], ['Init']),
      ],
    )

  const messageRowView = (
    tag: string,
    absoluteIndex: number,
    isSelected: boolean,
    timeDelta: number,
  ): Html =>
    div(
      [
        Class(clsx(ROW_BASE, isSelected && 'selected')),
        OnClick(ClickedRow({ index: absoluteIndex })),
      ],
      [
        span([Class(indexClass)], [String(absoluteIndex)]),
        span([Class('text-xs text-dt font-mono flex-1 truncate')], [tag]),
        span(
          [Class('text-2xs text-dt-muted font-mono shrink-0')],
          [formatTimeDelta(timeDelta)],
        ),
      ],
    )

  const messageListView = (model: Model): Html => {
    const baseTimestamp = Option.match(Array.head(model.entries), {
      onNone: () => 0,
      onSome: first => first.timestamp,
    })

    const isInitSelected = model.isPaused && model.pausedAtIndex === INIT_INDEX

    const messageRows = Array.map(model.entries, (entry, arrayIndex) => {
      const absoluteIndex = model.startIndex + arrayIndex
      const isSelected = model.isPaused && model.pausedAtIndex === absoluteIndex

      return messageRowView(
        entry.tag,
        absoluteIndex,
        isSelected,
        entry.timestamp - baseTimestamp,
      )
    })

    return div(
      [Class('message-list flex-1 overflow-y-auto min-h-0')],
      [initRowView(isInitSelected), ...messageRows],
    )
  }

  const statusBarView = (model: Model): Html => {
    const totalEntries = Array.length(model.entries)
    const pausedLabel =
      model.pausedAtIndex === INIT_INDEX
        ? 'Paused at init'
        : `Paused at ${model.pausedAtIndex}/${model.startIndex + totalEntries - 1}`

    return div(
      [
        Class(
          'flex items-center justify-between px-3 py-1.5 border-t shrink-0 text-sm font-sans',
        ),
      ],
      model.isPaused
        ? [
            span([Class('text-dt-paused font-medium')], [pausedLabel]),
            button(
              [
                Class(
                  'bg-transparent border border-dt-live text-dt-live cursor-pointer text-sm font-sans px-2.5 py-0.5 rounded font-medium',
                ),
                OnClick(ClickedResume()),
              ],
              ['Resume'],
            ),
          ]
        : [
            span(
              [Class('flex items-center gap-1.5')],
              [
                span(
                  [Class('w-1.5 h-1.5 rounded-full bg-dt-live inline-block')],
                  [],
                ),
                span([Class('text-dt-live font-medium')], ['Live']),
              ],
            ),
            span([Class('text-dt-muted')], [`${totalEntries} messages`]),
          ],
    )
  }

  const panelView = (model: Model): Html =>
    div(
      [
        Class(
          'fixed right-4 dt-panel bg-dt-bg border rounded-lg flex flex-col overflow-hidden font-sans text-dt',
        ),
      ],
      [headerView, messageListView(model), statusBarView(model)],
    )

  return (model: Model): Html =>
    div([], [...(model.isOpen ? [panelView(model)] : []), badgeView(model)])
}

// CREATE

export const createOverlay = (store: DevtoolsStore) =>
  Effect.gen(function* () {
    const existingHost = document.getElementById('foldkit-devtools')
    if (existingHost) {
      existingHost.remove()
    }

    const host = document.createElement('div')
    host.id = 'foldkit-devtools'
    document.body.appendChild(host)

    const shadow = host.attachShadow({ mode: 'open' })

    const styleElement = document.createElement('style')
    styleElement.textContent = overlayStyles
    shadow.appendChild(styleElement)

    const container = document.createElement('div')
    shadow.appendChild(container)

    const currentState = yield* SubscriptionRef.get(store.stateRef)

    const init = (): [Model, ReadonlyArray<Command<Message>>] => [
      {
        isOpen: false,
        ...toDisplayState(currentState),
      },
      [],
    ]

    const overlayRuntime = makeElement({
      Model,
      init,
      update: makeUpdate(store, shadow),
      view: makeView(),
      container,
      subscriptions: makeOverlaySubscriptions(store),
      devtools: false,
    })

    yield* Effect.forkDaemon(overlayRuntime())
  })
