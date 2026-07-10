import { Effect, Match as M, Schema as S } from 'effect'
import { Command, Dom, Render } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MESSAGE

const UpdatedNoteBody = m('UpdatedNoteBody', { value: S.String })
const ClickedOpenPreview = m('ClickedOpenPreview')
const CompletedLockScroll = m('CompletedLockScroll')
const CompletedRenderDiagrams = m('CompletedRenderDiagrams')

const Message = S.Union([
  UpdatedNoteBody,
  ClickedOpenPreview,
  CompletedLockScroll,
  CompletedRenderDiagrams,
])
type Message = typeof Message.Type

// COMMAND

const LockScroll = Command.define(
  'LockScroll',
  CompletedLockScroll,
)(Dom.lockScroll.pipe(Effect.as(CompletedLockScroll())))

const RenderDiagrams = Command.define(
  'RenderDiagrams',
  CompletedRenderDiagrams,
)(
  Effect.gen(function* () {
    yield* Render.afterCommit
    const mermaid = yield* Effect.promise(() => import('mermaid'))
    yield* Effect.promise(() =>
      mermaid.default.run({ querySelector: '.mermaid' }),
    )
  }).pipe(Effect.ignore, Effect.as(CompletedRenderDiagrams())),
)

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tags({
      UpdatedNoteBody: ({ value }) => [
        evo(model, { noteBody: () => value }),
        [],
      ],
      ClickedOpenPreview: () => [
        evo(model, { isPreviewOpen: () => true }),
        [LockScroll(), RenderDiagrams()],
      ],
    }),
    M.tag('CompletedLockScroll', 'CompletedRenderDiagrams', () => [model, []]),
    M.exhaustive,
  )
