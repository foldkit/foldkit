// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Schema, Tuple } from 'effect'
import { Block, File, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'
import type { FileDropAttributes as FileDropFileDropAttributes } from '@foldkit/ui/fileDrop'

// Add the FileDrop Block to your Model, plus a list of accepted files:
const Model = Schema.Struct({
  uploader: FileDrop.Model,
  uploadedFiles: Schema.Array(File.File),
  // ...your other fields
})
type Model = typeof Model.Type

// Embed FileDrop's Message in your parent Message:
const Message = defineMessageUnion({
  GotFileDropMessage: { message: FileDrop.Message },
})
type Message = typeof Message.Type

// At module scope, fold the OutMessage FileDrop emits when files arrive (via
// drop or input change) into your own Model. Each arm returns an Update.Step
// over the parent Model, which already has the next FileDrop Model written
// back:
const foldFileDropOutMessage = FileDrop.OutMessage.match<
  Update.Step<Model, Message>
>({
  ReceivedFiles:
    ({ files }) =>
    model => ({
      model: modifyFields(model, {
        uploadedFiles: Array.appendAll(files),
      }),
    }),
  // Fires when something is dropped but no files came through (e.g.
  // a drag of text or a URL). Ignore, or show a hint to the user.
  RejectedNonFiles: () => model => ({ model }),
})

// The Binding wires the completed child Block into the parent: it runs FileDrop.update,
// writes the next FileDrop Model back, maps the Block's Commands into your
// Message type, and hands any OutMessage to the OutMessage fold.
const FileDropExample = Block.define('FileDropExample', {
  Model,
  Message,
})

const FileDropBinding = FileDropExample.bindChild(FileDrop.block, {
  field: 'uploader',
  parentMessage: Message.GotFileDropMessage,
  init: { args: () => Tuple.make({ id: 'uploader' }) },
  outMessage: { fold: foldFileDropOutMessage },
})

const FileDropExampleComposition = FileDropExample.makeComposition({
  childBindings: [FileDropBinding],
})

// Initialize the fields the parent owns. The Composition initializes the
// bound FileDrop Model and combines the resulting Commands.
const init = FileDropExampleComposition.makeInit(() => ({
  model: {
    uploadedFiles: [],
    // ...your other fields
  },
}))

const update = FileDropExampleComposition.makeUpdate()

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
