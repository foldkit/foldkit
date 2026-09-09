import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

const EditorMode = defineTaggedUnion({
  Browsing: {},
  Editing: { noteId: Schema.String },
  Previewing: { noteId: Schema.String },
})
type EditorMode = typeof EditorMode.Type

const Model = Schema.Struct({
  editorMode: EditorMode,
})
type Model = typeof Model.Type

const init = (): Model => ({
  editorMode: EditorMode.Browsing(),
})

const modeLabel = (mode: EditorMode): string =>
  EditorMode.match(mode, {
    Browsing: () => 'Browsing notes',
    Editing: ({ noteId }) => `Editing ${noteId}`,
    Previewing: ({ noteId }) => `Previewing ${noteId}`,
  })
