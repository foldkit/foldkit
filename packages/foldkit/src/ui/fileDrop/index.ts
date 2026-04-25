import { Array, Match as M, Option, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as File from '../../file/index.js'
import {
  type Attribute,
  type Html,
  createLazy,
  html,
} from '../../html/index.js'
import { m } from '../../message/index.js'
import { evo } from '../../struct/index.js'

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
/** Sent when a drop or input-change event fires without any files \u2014
 * typically a drag of non-file data (text, URLs, images from another
 * page). Resets `isDragOver` and emits `DroppedWithoutFiles` as an
 * OutMessage so the consumer can surface a message (e.g. "Only files are
 * accepted"). */
export const DroppedWithoutFiles = m('DroppedWithoutFiles')

/** Union of all messages the file-drop component can produce. */
export const Message = S.Union(
  EnteredDragZone,
  LeftDragZone,
  DroppedFiles,
  DroppedWithoutFiles,
)
export type Message = typeof Message.Type

// OUT MESSAGE

/** Emitted when files arrive via drop or input-change. The consumer's
 * parent update handles this to process the files (validate, upload,
 * store in Model, etc.). The files list is non-empty. */
export const ReceivedFiles = m('ReceivedFiles', {
  files: S.NonEmptyArray(File.File),
})

/** The file-drop component's OutMessages: `ReceivedFiles` on the happy
 * path and `DroppedWithoutFiles` when a drop event fires without files.
 * `DroppedWithoutFiles` is reused from the Message definitions \u2014 the
 * fact is the same whether the component is handling it or reporting it
 * up. */
export const OutMessage = S.Union(ReceivedFiles, DroppedWithoutFiles)
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
      DroppedWithoutFiles: () => [
        evo(model, { isDragOver: () => false }),
        [],
        Option.some(DroppedWithoutFiles()),
      ],
    }),
  )

// VIEW

/** Attribute groups the file-drop component provides to the consumer's
 * `toView` callback. Spread each group onto the element that plays that
 * role: `root` typically goes on a `<label>` so clicking it focuses the
 * hidden input, `input` on the `<input type="file">`. */
export type FileDropAttributes<ParentMessage> = Readonly<{
  /** Attributes for the outer drop zone element (typically a `<label>`):
   * drag-and-drop handlers, `data-drag-over` while a drag hovers, and
   * `data-disabled` when disabled. */
  root: ReadonlyArray<Attribute<ParentMessage>>
  /** Attributes for a hidden `<input type="file">` nested inside the
   * root: file-change handler, `type`, `id`, `multiple`, `accept`, and
   * `sr-only` class. */
  input: ReadonlyArray<Attribute<ParentMessage>>
}>

/** Configuration for rendering a file-drop with `view`.
 *
 * The `ParentMessage` type parameter is your parent's Message type, not
 * FileDrop's. `toParentMessage` receives a FileDrop message and returns
 * your parent message. */
export type ViewConfig<ParentMessage> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => ParentMessage
  toView: (attributes: FileDropAttributes<ParentMessage>) => Html
  /** List of accepted MIME types or file extensions (e.g.
   * `['application/pdf', '.doc']`). Joined with commas and forwarded to
   * the hidden input's `accept` attribute. Omit or pass an empty array
   * to accept any file type. */
  accept?: ReadonlyArray<string>
  /** When true, the hidden input accepts multiple files per selection. */
  multiple?: boolean
  /** When true, drag handlers are stripped from the root and the input
   * is disabled. Styling can react via `data-disabled` on the root. */
  isDisabled?: boolean
}>

/** Renders an accessible file-drop zone by building attribute groups for
 * a `<label>`-wrapped hidden file input. The consumer's `toView` callback
 * composes those groups into concrete markup. The component owns the
 * drag-state and file-arrival messaging; the consumer owns the visual
 * rendering. */
export const view = <ParentMessage>(
  config: ViewConfig<ParentMessage>,
): Html => {
  const {
    Accept,
    AllowDrop,
    Class,
    DataAttribute,
    Disabled,
    Id,
    Multiple,
    OnDragEnter,
    OnDragLeave,
    OnDropFiles,
    OnFileChange,
    Type,
  } = html<ParentMessage>()

  const {
    model: { id, isDragOver },
    toParentMessage,
    accept,
    multiple = false,
    isDisabled = false,
  } = config

  const stateAttributes = [
    ...(isDragOver ? [DataAttribute('drag-over', '')] : []),
    ...(isDisabled ? [DataAttribute('disabled', '')] : []),
  ]

  const rootAttributes = isDisabled
    ? stateAttributes
    : [
        ...stateAttributes,
        OnDragEnter(toParentMessage(EnteredDragZone())),
        OnDragLeave(toParentMessage(LeftDragZone())),
        AllowDrop(),
        OnDropFiles(files =>
          toParentMessage(
            Array.match(files, {
              onEmpty: () => DroppedWithoutFiles(),
              onNonEmpty: nonEmptyFiles =>
                DroppedFiles({ files: [...nonEmptyFiles] }),
            }),
          ),
        ),
      ]

  const inputAttributes = [
    Id(id),
    Type('file'),
    Class('sr-only'),
    ...(multiple ? [Multiple(true)] : []),
    ...(accept !== undefined && accept.length > 0
      ? [Accept(accept.join(','))]
      : []),
    ...(isDisabled
      ? [Disabled(true)]
      : [
          OnFileChange(files =>
            toParentMessage(
              Array.match(files, {
                onEmpty: () => DroppedWithoutFiles(),
                onNonEmpty: nonEmptyFiles =>
                  DroppedFiles({ files: [...nonEmptyFiles] }),
              }),
            ),
          ),
        ]),
  ]

  return config.toView({
    root: rootAttributes,
    input: inputAttributes,
  })
}

/** Creates a memoized file-drop view. Static config is captured in a
 * closure; only `model` and `toParentMessage` are compared per render via
 * `createLazy`. */
export const lazy = <ParentMessage>(
  staticConfig: Omit<ViewConfig<ParentMessage>, 'model' | 'toParentMessage'>,
): ((
  model: Model,
  toParentMessage: ViewConfig<ParentMessage>['toParentMessage'],
) => Html) => {
  const lazyView = createLazy()

  return (model, toParentMessage) =>
    lazyView(
      (
        currentModel: Model,
        currentToMessage: ViewConfig<ParentMessage>['toParentMessage'],
      ) =>
        view({
          ...staticConfig,
          model: currentModel,
          toParentMessage: currentToMessage,
        }),
      [model, toParentMessage],
    )
}
