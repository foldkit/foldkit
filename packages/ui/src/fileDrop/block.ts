import { Array, Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import * as File from 'foldkit/file'
import { type ChildAttribute, type Html, childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// MODEL

/** Schema for the file-drop component's state.
 *
 * `isDragOver` controls the `data-drag-over` attribute on the root while a
 * drag is hovering. The html layer's `OnDragEnter`/`OnDragLeave` handlers
 * track the per-element active state internally so transitions between
 * children of the zone do not flicker the boolean off-and-on. */
export const Model = Schema.Struct({
  id: Schema.String,
  isDragOver: Schema.Boolean,
})
export type Model = typeof Model.Type

// MESSAGE

/** Union of all messages the file-drop component can produce. */
export const Message = defineMessageUnion({
  EnteredDragZone: {},
  LeftDragZone: {},
  DroppedFiles: { files: Schema.NonEmptyArray(File.File) },
  DroppedNonFiles: {},
})
export type Message = typeof Message.Type

// OUT MESSAGE

/** The file-drop component's OutMessages: `ReceivedFiles` on the happy
 * path and `RejectedNonFiles` when a drop event fires without files. */
export const OutMessage = defineMessageUnion({
  ReceivedFiles: { files: Schema.NonEmptyArray(File.File) },
  RejectedNonFiles: {},
})
export type OutMessage = typeof OutMessage.Type

// VIEW INPUT

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

/** Per-render view inputs the parent passes to `model.fileDrop.view(...)`. */
export type ViewInputs = Readonly<{
  toView: (attributes: FileDropAttributes) => Html
  accept?: ReadonlyArray<string>
  multiple?: boolean
  isDisabled?: boolean
}>

// BLOCK

/** Constructor args for a FileDrop instance. `id` is the DOM id of the
 *  hidden file input. */
export type InitConfig = Readonly<{
  id: string
}>

/** An accessible file-drop zone that publishes attribute groups for a
 *  `<label>`-wrapped hidden file input. Drag state starts cleared. */
export class FileDrop extends Block<FileDrop, InitConfig, ViewInputs>()(
  'FileDrop',
  { Model, Message, OutMessage },
) {}

const dispatchDroppedFiles = (files: ReadonlyArray<File.File>) =>
  Array.match(files, {
    onEmpty: () => Message.DroppedNonFiles(),
    onNonEmpty: nonEmptyFiles =>
      Message.DroppedFiles({ files: [...nonEmptyFiles] }),
  })

/** The FileDrop implementation. Provide it to every parent that creates a
 *  FileDrop instance. */
export const FileDropLive = FileDrop.make(
  Effect.fn(function* (_instanceId, { id }) {
    return {
      model: { id, isDragOver: false },

      update: {
        EnteredDragZone: model => ({
          model: modifyFields(model, { isDragOver: () => true }),
        }),
        LeftDragZone: model => ({
          model: modifyFields(model, { isDragOver: () => false }),
        }),
        DroppedFiles: (model, { files }) => ({
          model: modifyFields(model, { isDragOver: () => false }),
          outMessage: OutMessage.ReceivedFiles({ files }),
        }),
        DroppedNonFiles: model => ({
          model: modifyFields(model, { isDragOver: () => false }),
          outMessage: OutMessage.RejectedNonFiles(),
        }),
      },

      view: (model, h, viewInputs) => {
        const { isDragOver } = model
        const {
          toView,
          accept,
          multiple = false,
          isDisabled = false,
        } = viewInputs

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
          h.Id(model.id),
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
    }
  }),
)
