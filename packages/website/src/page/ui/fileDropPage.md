# FileDrop

## Overview

A file drop zone that accepts files via both drag-and-drop and a hidden `<input type="file">`. FileDrop is headless. The component owns drag state and file-arrival events; your `toView` callback owns the visual.

`FileDrop.block` is the completed Block to connect in the parent. Declare its startup arguments on the Binding, register that Binding in the parent Composition, and render with `h.block(Binding.embedView(...))`. The Composition update routes the wrapper Message through the Binding automatically. The update function returns `Update.ReturnWithOutMessage<Model, Message, OutMessage>`. `ReceivedFiles` fires when files arrive with a guaranteed non-empty list. `RejectedNonFiles` fires when a drop or change event produced no files, for example when someone drags non-file data. Match both in the Binding’s `outMessage.fold` policy.

:::Info{label="See it in an app"}
Check out how FileDrop is wired up in a [real Foldkit app](https://github.com/foldkit/foldkit/blob/main/examples/ui-showcase/src/ui/view/fileDrop.ts).
:::

## Examples

A multi-file drop zone. Drag files on or click to browse. The component exposes `data-drag-over` on the root while a drag hovers, so you can style the highlighted state with `data-[drag-over]:*` utilities.

::Demo{name="basic"}

::Snippet{name="uiFileDropBasic" label="File drop"}

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

### ViewInputs {#view-config}

Pass the child Model as `model` and these fields as `viewInputs` to the FileDrop Binding's `embedView` method. The Binding supplies the canonical view, Message wrapper, and composition scope. Keep `toView` at the top level, and spread the published `ChildAttribute` groups unchanged; see [Callback dispatch boundaries](/core/block#callback-dispatch-boundaries).

| Name         | Type                                       | Default | Description                                                                                                                                                                                                      |
| ------------ | ------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `toView`     | `(attributes: FileDropAttributes) => Html` | —       | Callback that receives attribute groups for the root drop-zone element and the hidden file input.                                                                                                                |
| `accept`     | `ReadonlyArray<string>`                    | —       | List of accepted MIME types or file extensions (e.g. ["application/pdf", ".doc"]). Joined with commas and forwarded to the hidden input's accept attribute. Omit or pass an empty array to accept any file type. |
| `multiple`   | `boolean`                                  | `false` | When true, the hidden input accepts multiple files per selection. Drag-and-drop always accepts multiple files.                                                                                                   |
| `isDisabled` | `boolean`                                  | `false` | Strips drag handlers from the root and disables the input. Styling can react via data-disabled on the root.                                                                                                      |

### FileDropAttributes {#file-drop-attributes}

Attribute groups provided to the `toView` callback.

| Name    | Type                            | Default | Description                                                                                                                                                                      |
| ------- | ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `root`  | `ReadonlyArray<ChildAttribute>` | —       | Spread onto the outer drop-zone element (typically a `<label>`). Includes drag handlers (dragenter/dragleave/dragover/drop) and data attributes (data-drag-over, data-disabled). |
| `input` | `ReadonlyArray<ChildAttribute>` | —       | Spread onto a hidden `<input type="file">` nested inside the root. Includes the id, type, multiple, accept, sr-only class, and the file-change handler.                          |

### OutMessage {#out-message}

The optional `outMessage` field of the update record. Handle it in the Binding’s `outMessage.fold` policy to process arriving files.

| Name               | Type                                     | Default | Description                                                                                                                                                                                                                              |
| ------------------ | ---------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReceivedFiles`    | `{ files: NonEmptyReadonlyArray<File> }` | —       | Emitted when the user drops files on the zone or selects them via the hidden input. The files list is guaranteed non-empty. Handle it in the Binding's `outMessage.fold` policy to process the files (validate, upload, store in Model). |
| `RejectedNonFiles` | `{}`                                     | —       | Emitted when a drop or input-change event fires without any files, typically a drag of non-file data (text, URLs, images from another page). Consumers can ignore this or surface a hint to the user.                                    |
