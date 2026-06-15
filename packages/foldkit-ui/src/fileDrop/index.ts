import { Array, Match as M, Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import * as File from 'foldkit/file'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
  html,
} from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'
import { defineView } from 'foldkit/submodel'

// MODEL

/** Schema for the file-drop component's state.
 *
 * `isDragOver` controls the `data-drag-over` attribute on the root while a
 * drag is hovering. The html layer's `OnDragEnter`/`OnDragLeave` handlers
 * track the per-element active state internally so transitions between
 * children of the zone do not flicker the boolean off-and-on. */
export const Model = S.Struct({
  id: S.String,
  isDragOver: S.Boolean,
})
export type Model = typeof Model.Type

// MESSAGE

/** Sent when a drag enters the drop zone. Flips `isDragOver` to true so
 * the consumer's styling can highlight the zone. */
export const EnteredDragZone = m('EnteredDragZone')
/** Sent when a drag leaves the drop zone without dropping. Flips
 * `isDragOver` back to false. */
export const LeftDragZone = m('LeftDragZone')
/** Sent when the user drops files on the zone or selects them via the
 * hidden `<input type="file">`. Carries a non-empty list of `File`
 * objects, resets `isDragOver`, and emits `ReceivedFiles` as an
 * OutMessage. */
export const DroppedFiles = m('DroppedFiles', {
  files: S.NonEmptyArray(File.File),
})
/** Sent when a drop or input-change event fires without any files,
 * typically a drag of non-file data (text, URLs, images from another
 * page). Resets `isDragOver` and emits `RejectedNonFiles` as an
 * OutMessage so the consumer can surface a message (e.g. "Only files are
 * accepted"). */
export const DroppedNonFiles = m('DroppedNonFiles')

/** Union of all messages the file-drop component can produce. */
export const Message = S.Union([
  EnteredDragZone,
  LeftDragZone,
  DroppedFiles,
  DroppedNonFiles,
])
export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted when files arrive via drop or input-change. The consumer's
 * parent update handles this to process the files (validate, upload,
 * store in Model, etc.). The files list is non-empty. */
export const ReceivedFiles = m('ReceivedFiles', {
  files: S.NonEmptyArray(File.File),
})

/** Emitted when a drop or input-change event produces no files. The
 * consumer's parent update handles this to surface a message (e.g. "Only
 * files are accepted"). */
export const RejectedNonFiles = m('RejectedNonFiles')

/** The file-drop component's OutMessages: `ReceivedFiles` on the happy
 * path and `RejectedNonFiles` when a drop event fires without files. */
export const OutMessage = S.Union([ReceivedFiles, RejectedNonFiles])
export type OutMessage = typeof OutMessage.Type

// INIT

/** Configuration for creating a file-drop model with `init`. */
export type InitConfig = Readonly<{
  id: string
}>

/** Creates an initial file-drop model. Drag state starts cleared. */
export const init = (config: InitConfig): Model => ({
  id: config.id,
  isDragOver: false,
})

// UPDATE

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

/** Processes a file-drop message and returns the next model, commands,
 * and optional OutMessage. */
export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      EnteredDragZone: () => [
        evo(model, { isDragOver: () => true }),
        [],
        Option.none(),
      ],
      LeftDragZone: () => [
        evo(model, { isDragOver: () => false }),
        [],
        Option.none(),
      ],
      DroppedFiles: ({ files }) => [
        evo(model, { isDragOver: () => false }),
        [],
        Option.some(ReceivedFiles({ files })),
      ],
      DroppedNonFiles: () => [
        evo(model, { isDragOver: () => false }),
        [],
        Option.some(RejectedNonFiles()),
      ],
    }),
  )

// VIEW

/** Attribute groups the file-drop component provides to the consumer's
 *  `toView` callback. */
export type FileDropAttributes = Readonly<{
  /** Attributes for the outer drop zone element (typically a `<label>`):
   *  drag-and-drop handlers, `data-drag-over` while a drag hovers, and
   *  `data-disabled` when disabled. */
  root: ReadonlyArray<ChildAttribute>
  /** Attributes for a hidden `<input type="file">` nested inside the
   *  root: file-change handler, `type`, `id`, `multiple`, `accept`, and
   *  `sr-only` class. */
  input: ReadonlyArray<ChildAttribute>
}>

/** Per-render view inputs passed to `view` via `h.submodel`'s `viewInputs` field. */
export type ViewInputs = Readonly<{
  toView: (attributes: FileDropAttributes) => Html
  accept?: ReadonlyArray<string>
  multiple?: boolean
  isDisabled?: boolean
}>

const dispatchDroppedFiles = (files: ReadonlyArray<File.File>) =>
  Array.match(files, {
    onEmpty: () => DroppedNonFiles(),
    onNonEmpty: nonEmptyFiles => DroppedFiles({ files: [...nonEmptyFiles] }),
  })

/** Renders an accessible file-drop zone by publishing attribute groups
 *  for a `<label>`-wrapped hidden file input. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs): Html => {
    const h = html<Message>()

    const { id, isDragOver } = model
    const { toView, accept, multiple = false, isDisabled = false } = viewInputs

    const stateAttributes = [
      ...(isDragOver ? [h.DataAttribute('drag-over', '')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', '')] : []),
    ]

    const rootAttributes = isDisabled
      ? stateAttributes
      : [
          ...stateAttributes,
          h.OnDragEnter(EnteredDragZone()),
          h.OnDragLeave(LeftDragZone()),
          h.AllowDrop(),
          h.OnDropFiles(dispatchDroppedFiles),
        ]

    const inputAttributes = [
      h.Id(id),
      h.Type('file'),
      h.Class('sr-only'),
      ...(multiple ? [h.Multiple(true)] : []),
      ...(accept !== undefined && accept.length > 0
        ? [h.Accept(accept.join(','))]
        : []),
      ...(isDisabled
        ? [h.Disabled(true)]
        : [h.OnFileChange(dispatchDroppedFiles)]),
    ]

    return toView({
      root: childAttributes(rootAttributes),
      input: childAttributes(inputAttributes),
    })
  },
)
