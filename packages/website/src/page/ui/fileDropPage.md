# FileDrop

## Overview

A file drop zone that accepts files via both drag-and-drop and a hidden `<input type="file">`. FileDrop is headless. The component owns drag state and file-arrival events; your `toView` callback owns the visual.

FileDrop uses the Submodel pattern: initialize with `FileDrop.init()`, wire Messages through [`Update.foldChild`](/core/submodel#fold-child) in your parent update, and render with `FileDrop.view()`. The update function returns `[Model, Commands, Option<OutMessage>]`. `ReceivedFiles` fires when files arrive with a guaranteed non-empty list; `RejectedNonFiles` fires when a drop or change event produced no files (e.g. a drag of non-file data). Match both in the fold's `foldOutMessage`.

:::Info{label="See it in an app"}
Check out how FileDrop is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/fileDrop.ts).
:::

## Examples

A multi-file drop zone. Drag files on or click to browse. The component exposes `data-drag-over` on the root while a drag hovers, so you can style the highlighted state with `data-[drag-over]:*` utilities.

::Demo{name="basic"}

::Snippet{name="uiFileDropBasic" label="file drop example"}

## Styling

FileDrop is headless. Your `toView` callback composes a `<label>` with the `root` attributes and an `<input>` with the `input` attributes. Wrap the input inside the label so native click-to-browse works. Use `data-[drag-over]:*` and `data-[disabled]:*` utilities to style state variants.

| Attribute        | Condition                                                   |
| ---------------- | ----------------------------------------------------------- |
| `data-drag-over` | Present on the root while a drag is hovering over the zone. |
| `data-disabled`  | Present on the root when isDisabled is true.                |

## Accessibility

The hidden `<input type="file">` stays in the DOM but visually hidden via the `sr-only` class so keyboard users can tab to it and trigger the native file picker. Wrapping the input in a `<label>` (via `attributes.root`) means clicking anywhere on the drop zone opens the picker.

## API Reference

### InitConfig {#init-config}

Configuration object passed to `FileDrop.init()`.

| Name | Type     | Default | Description                                                                                               |
| ---- | -------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `id` | `string` | —       | Unique ID for the file-drop instance. Assigned to the hidden `<input type="file">` for label association. |

### ViewConfig {#view-config}

Configuration object passed to `FileDrop.view()`.

| Name              | Type                                                | Default | Description                                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model`           | `FileDrop.Model`                                    | —       | The file-drop state from your parent Model.                                                                                                                                                                      |
| `toParentMessage` | `(childMessage: FileDrop.Message) => ParentMessage` | —       | Wraps FileDrop Messages in your parent Message type for Submodel delegation.                                                                                                                                     |
| `toView`          | `(attributes: FileDropAttributes) => Html`          | —       | Callback that receives attribute groups for the root drop-zone element and the hidden file input.                                                                                                                |
| `accept`          | `ReadonlyArray<string>`                             | —       | List of accepted MIME types or file extensions (e.g. ["application/pdf", ".doc"]). Joined with commas and forwarded to the hidden input's accept attribute. Omit or pass an empty array to accept any file type. |
| `multiple`        | `boolean`                                           | `false` | When true, the hidden input accepts multiple files per selection. Drag-and-drop always accepts multiple files.                                                                                                   |
| `isDisabled`      | `boolean`                                           | `false` | Strips drag handlers from the root and disables the input. Styling can react via data-disabled on the root.                                                                                                      |

### FileDropAttributes {#file-drop-attributes}

Attribute groups provided to the `toView` callback.

| Name    | Type                                | Default | Description                                                                                                                                                                      |
| ------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`  | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto the outer drop-zone element (typically a `<label>`). Includes drag handlers (dragenter/dragleave/dragover/drop) and data attributes (data-drag-over, data-disabled). |
| `input` | `ReadonlyArray<Attribute<Message>>` | —       | Spread onto a hidden `<input type="file">` nested inside the root. Includes the id, type, multiple, accept, sr-only class, and the file-change handler.                          |

### OutMessage {#out-message}

The third element of the update tuple (`[Model, Commands, Option<OutMessage>]`). Fold it in the `foldOutMessage` of your [`Update.foldChild`](/core/submodel#fold-child) config to process arriving files.

| Name               | Type                                     | Default | Description                                                                                                                                                                                                                                |
| ------------------ | ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ReceivedFiles`    | `{ files: NonEmptyReadonlyArray<File> }` | —       | Emitted when the user drops files on the zone or selects them via the hidden input. The files list is guaranteed non-empty. Fold it in the `foldOutMessage` of your FileDrop fold to process the files (validate, upload, store in Model). |
| `RejectedNonFiles` | `{}`                                     | —       | Emitted when a drop or input-change event fires without any files, typically a drag of non-file data (text, URLs, images from another page). Consumers can ignore this or surface a hint to the user.                                      |
