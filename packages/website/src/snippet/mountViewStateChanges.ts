import { Context, Effect, Schema, Stream } from 'effect'
import { Block, Mount } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export type RichTextEditor = Readonly<{
  setEditable: (isEditable: boolean) => void
  destroy: () => void
}>

export class RichTextEditors extends Context.Service<
  RichTextEditors,
  Readonly<{ create: (element: Element) => RichTextEditor }>
>()('RichTextEditors') {}

const Message = defineMessageUnion({
  CompletedMountEditor: {},
})

const MountEditor = Mount.define('MountEditor', {
  messages: [Message.CompletedMountEditor],
})

export class Notes extends Block<Notes>()('Notes', {
  Model: Schema.Struct({}),
  Message,
  Mount: [MountEditor],
}) {}

export const NotesLive = Notes.make(
  Effect.fn(function* () {
    const editors = yield* RichTextEditors

    return {
      model: {},

      update: {
        CompletedMountEditor: model => ({ model }),
      },

      mounts: {
        MountEditor: ({ element, viewStateChanges }) =>
          Effect.gen(function* () {
            const editor = yield* Effect.acquireRelease(
              Effect.sync(() => editors.create(element)),
              mountedEditor => Effect.sync(() => mountedEditor.destroy()),
            )

            yield* viewStateChanges.pipe(
              Stream.runForEach(viewState =>
                Effect.sync(() => editor.setEditable(viewState === 'Live')),
              ),
              Effect.forkScoped,
            )

            return Message.CompletedMountEditor()
          }),
      },

      view: (_model, h) => h.div([h.OnMount(MountEditor())]),
    }
  }),
)
