// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, File, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, input, label, p, span } from './html'

// Add the FileDrop Submodel to your Model, plus a list of accepted files:
const Model = S.Struct({
  uploader: Ui.FileDrop.Model,
  uploadedFiles: S.Array(File.File),
  // ...your other fields
})

// Initialize both fields:
const init = () => [
  {
    uploader: Ui.FileDrop.init({ id: 'uploader' }),
    uploadedFiles: [],
    // ...your other fields
  },
  [],
]

// Embed FileDrop's Message in your parent Message:
const GotFileDropMessage = m('GotFileDropMessage', {
  message: Ui.FileDrop.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// FileDrop.update and pattern-match on the OutMessage it emits when files
// arrive (via drop or input change):
GotFileDropMessage: ({ message }) => {
  const [nextUploader, commands, maybeOutMessage] = Ui.FileDrop.update(
    model.uploader,
    message,
  )

  const nextFiles = Option.match(maybeOutMessage, {
    onNone: () => model.uploadedFiles,
    onSome: M.type<Ui.FileDrop.OutMessage>().pipe(
      M.tagsExhaustive({
        ReceivedFiles: ({ files }) => [...model.uploadedFiles, ...files],
      }),
    ),
  })

  return [
    evo(model, {
      uploader: () => nextUploader,
      uploadedFiles: () => nextFiles,
    }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotFileDropMessage({ message }))),
    ),
  ]
}

// Render the drop zone. The `toView` callback receives attribute groups.
// Spread `root` onto a <label> so clicking opens the picker, and spread
// `input` onto a hidden <input type="file"> nested inside. Style the
// drag-over state via `data-drag-over`.
Ui.FileDrop.view({
  model: model.uploader,
  toParentMessage: message => GotFileDropMessage({ message }),
  multiple: true,
  accept: ['application/pdf', '.doc', '.docx'],
  toView: attributes =>
    label(
      [
        ...attributes.root,
        Class(
          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-accent-400 data-[drag-over]:border-accent-500 data-[drag-over]:bg-accent-50',
        ),
      ],
      [
        p([], ['Drop files or click to browse']),
        span([Class('text-sm text-gray-500')], ['PDF, DOC, or DOCX']),
        input(attributes.input),
      ],
    ),
})
