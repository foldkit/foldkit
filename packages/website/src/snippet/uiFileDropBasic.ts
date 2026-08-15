// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { File, Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'

// Add the FileDrop Submodel to your Model, plus a list of accepted files:
const Model = S.Struct({
  uploader: FileDrop.Model,
  uploadedFiles: S.Array(File.File),
  // ...your other fields
})

// Initialize both fields:
const init = () => [
  {
    uploader: FileDrop.init({ id: 'uploader' }),
    uploadedFiles: [],
    // ...your other fields
  },
  [],
]

// Embed FileDrop's Message in your parent Message:
const GotFileDropMessage = m('GotFileDropMessage', {
  message: FileDrop.Message,
})

// At module scope, fold the OutMessage FileDrop emits when files arrive (via
// drop or input change) into your own Model. Each arm returns an Update.Step
// over the parent Model, which already has the next FileDrop Model written
// back:
const foldFileDropOutMessage = M.type<FileDrop.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    ReceivedFiles:
      ({ files }) =>
      model => [
        evo(model, {
          uploadedFiles: () => [...model.uploadedFiles, ...files],
        }),
        [],
      ],
    // Fires when something is dropped but no files came through (e.g.
    // a drag of text or a URL). Ignore, or show a hint to the user.
    RejectedNonFiles: () => model => [model, []],
  }),
)

// Update.foldChild wires the child into the parent: it runs FileDrop.update,
// writes the next FileDrop Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldFileDrop = Update.foldChild({
  update: FileDrop.update,
  read: (model: Model) => Option.some(model.uploader),
  write: (model, nextUploader) => evo(model, { uploader: () => nextUploader }),
  toParentMessage: message => GotFileDropMessage({ message }),
  foldOutMessage: foldFileDropOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotFileDropMessage: ({ message }) => foldFileDrop(model, message)

// Render the drop zone. The `toView` callback receives attribute groups.
// Spread `root` onto a <label> so clicking opens the picker, and spread
// `input` onto a hidden <input type="file"> nested inside. Style the
// drag-over state via `data-drag-over`.
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'uploader',
    model: model.uploader,
    view: FileDrop.view,
    viewInputs: {
      multiple: true,
      accept: ['application/pdf', '.doc', '.docx'],
      toView: attributes =>
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
        ),
    },
    toParentMessage: message => GotFileDropMessage({ message }),
  })
