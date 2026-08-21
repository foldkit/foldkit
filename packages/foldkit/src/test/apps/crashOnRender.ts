import { Array, Effect, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import type { Document, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const RawSource = S.Struct({
  kind: S.Literal('Book'),
  id: S.String,
})
export type RawSource = typeof RawSource.Type

// NOTE: the strict counterpart of RawSource, requiring a non-empty id.
// Constructing one (or a SelectedSource Message carrying one) from an empty id
// throws at construction time, which is what drives the render and update crash.
export const Source = S.Struct({
  kind: S.Literal('Book'),
  id: S.String.check(S.isNonEmpty()),
})
export type Source = typeof Source.Type

export const Model = S.Struct({
  sources: S.Array(RawSource),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedReload: {},
  CompletedReloadSources: { sources: S.Array(RawSource) },
  SelectedSource: { source: Source },
  SubmittedNewSourceId: { id: S.String },
})

export type Message = typeof Message.Type

// COMMAND

// NOTE: the malformed entry (empty id) sits inertly as a RawSource until the
// view rebuilds its SelectedSource handler, which constructs a Source and throws.
export const reloadedSources: ReadonlyArray<RawSource> = [
  { kind: 'Book', id: '1' },
  { kind: 'Book', id: '' },
]

export const ReloadSources = Command.define('ReloadSources', {
  messages: [Message.CompletedReloadSources],
  execute: Effect.succeed(
    Message.CompletedReloadSources({ sources: reloadedSources }),
  ),
})

// INIT

export const validSources: ReadonlyArray<RawSource> = [
  { kind: 'Book', id: '1' },
]

export const malformedSources: ReadonlyArray<RawSource> = [
  { kind: 'Book', id: '' },
]

export const initialModel: Model = { sources: validSources }

// UPDATE

type UpdateReturn = Readonly<{
  model: Model
  commands?: ReadonlyArray<Command.Command<Message>>
  outMessage?: never
}>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedReload: () => ({ model, commands: [ReloadSources()] }),
    CompletedReloadSources: ({ sources }) => ({
      model: evo(model, { sources: () => sources }),
    }),
    SelectedSource: () => ({ model }),
    SubmittedNewSourceId: ({ id }) => {
      const source = Source.make({ kind: 'Book', id })
      return { model: evo(model, { sources: Array.append(source) }) }
    },
  })

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = h.div(
    [],
    [
      h.button(
        [h.OnClick(Message.ClickedReload()), h.Role('button')],
        ['Reload'],
      ),
      h.button(
        [h.OnClick(Message.SubmittedNewSourceId({ id: '' })), h.Role('button')],
        ['Add source'],
      ),
      h.ul(
        [h.Role('list')],
        Array.map(model.sources, source =>
          h.keyed('li')(
            source.id,
            [],
            [
              h.button(
                [
                  h.OnClick(Message.SelectedSource({ source })),
                  h.Role('button'),
                ],
                [`Select ${source.id}`],
              ),
            ],
          ),
        ),
      ),
    ],
  )

  return { title: 'Sources', body }
}
