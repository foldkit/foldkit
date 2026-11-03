import { Array, Effect, Schema } from 'effect'
import { Block, File } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  FileDropBlock,
  type FileDropAttributes as FileDropFileDropAttributes,
  layer as FileDropLayer,
} from '@foldkit/ui/fileDrop'

// Add the FileDrop Block to your Model, plus a list of accepted files:
const Model = Schema.Struct({
  uploader: FileDropBlock.Model,
  uploadedFiles: Schema.Array(File.File),
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

const FileDropExampleKey = Symbol('FileDropExample')

const FileDropExampleDefinition = Block.makeDefinition('FileDropExample', {
  key: FileDropExampleKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = FileDropExampleDefinition

// At module scope, fold the OutMessage FileDrop emits when files arrive (via
// drop or input change) into your own Model. Each arm returns an Update.Step
// over the parent Model, which already has the next FileDrop Model written
// back. The parent Definition checks every named child variant and infers the
// parent Step from each handler:
const foldFileDropOutMessage = FileDropExampleDefinition.makeOutMessageFold(
  FileDropBlock,
  {
    ReceivedFiles: ({ files }) =>
      makeFieldsStep(() => ({
        uploadedFiles: Array.appendAll(files),
      })),
    // Fires when something is dropped but no files came through (e.g.
    // a drag of text or a URL). Ignore, or show a hint to the user.
    RejectedNonFiles: makeNoopStep,
  },
)

// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const FileDropBinding = FileDropExampleDefinition.makeBinding(FileDropBlock, {
  field: 'uploader',
  init: { contextToArgs: () => [{ id: 'uploader' }] },
}).withOutMessagePolicy({ fold: foldFileDropOutMessage })

const FileDropExampleComposition = FileDropExampleDefinition.makeComposition({
  bindings: [FileDropBinding],
})

// Initialize the fields the parent owns. The Composition initializes the
// bound FileDrop Model and combines the resulting Commands.
const init = FileDropExampleComposition.makeInit(() => ({
  model: {
    uploadedFiles: [],
    // ...your other fields
  },
}))

const update = FileDropExampleComposition.makeUpdate({})

// Render the drop zone. The `toView` callback receives attribute groups.
// Spread `root` onto a <label> so clicking opens the picker, and spread
// `input` onto a hidden <input type="file"> nested inside. Style the
// drag-over state via `data-drag-over`.
const view = FileDropExampleComposition.makeView((model, h) => {
  const fileDropView = (attributes: FileDropFileDropAttributes) =>
    h.label(
      [
        ...attributes.root,
        h.Class(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-accent-400 data-[drag-over]:border-accent-500 data-[drag-over]:bg-accent-50',
        ),
      ],
      [
        h.p([], ['Drop files or click to browse']),
        h.span([h.Class('text-sm text-gray-500')], ['PDF, DOC, or DOCX']),
        h.input(attributes.input),
      ],
    )

  return h.block(
    FileDropBinding.embedView({
      slotId: 'uploader',
      model: model.uploader,
      viewInputs: {
        multiple: true,
        accept: ['application/pdf', '.doc', '.docx'],
        toView: fileDropView,
      },
    }),
  )
})

export const ApplicationBlock = FileDropExampleDefinition.makeBlock(
  Effect.gen(function* () {
    const fileDrop = yield* FileDropBinding

    return {
      children: [fileDrop],
      init,
      update,
      view,
    }
  }),
).provide(FileDropLayer)
