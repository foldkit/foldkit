import { Array, Schema as S } from 'effect'
import { type Update } from 'foldkit'
import * as File from 'foldkit/file'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
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

/** Union of all messages the file-drop component can produce. */
export const Message = defineMessageUnion({
  EnteredDragZone: {},
  LeftDragZone: {},
  DroppedFiles: { files: S.NonEmptyArray(File.File) },
  DroppedNonFiles: {},
})
export type Message = typeof Message.Type

// OUT MESSAGE

/** The file-drop component's OutMessages: `ReceivedFiles` on the happy
 * path and `RejectedNonFiles` when a drop event fires without files. */
export const OutMessage = defineMessageUnion({
  ReceivedFiles: { files: S.NonEmptyArray(File.File) },
  RejectedNonFiles: {},
})
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

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/** Processes a file-drop message and returns the next model, commands,
 * and optional OutMessage. */
export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    EnteredDragZone: () => ({ model: evo(model, { isDragOver: () => true }) }),
    LeftDragZone: () => ({ model: evo(model, { isDragOver: () => false }) }),
    DroppedFiles: ({ files }) => ({
      model: evo(model, { isDragOver: () => false }),
      outMessage: OutMessage.ReceivedFiles({ files }),
    }),
    DroppedNonFiles: () => ({
      model: evo(model, { isDragOver: () => false }),
      outMessage: OutMessage.RejectedNonFiles(),
    }),
  })

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
    onEmpty: () => Message.DroppedNonFiles(),
    onNonEmpty: nonEmptyFiles =>
      Message.DroppedFiles({ files: [...nonEmptyFiles] }),
  })

/** Renders an accessible file-drop zone by publishing attribute groups
 *  for a `<label>`-wrapped hidden file input. */
export const view = defineView<Model, Message, ViewInputs>(
  (model, viewInputs, h): Html => {
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
          h.OnDragEnter(Message.EnteredDragZone()),
          h.OnDragLeave(Message.LeftDragZone()),
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
