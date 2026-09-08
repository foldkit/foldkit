# File

## Overview

The `File` module brings browser file APIs into the Foldkit architecture. It opens the native picker through Commands, reads contents through Effects, and exposes synchronous metadata helpers. Inline inputs and drop zones use the typed file handlers in `foldkit/html` or the FileDrop Submodel.

`File.File` is both a direct alias for the browser's native `File` type and a Schema that accepts native File instances. A Model can hold one with `Schema.Option(File.File)`. The Schema treats the value as an opaque browser object; it validates the instance but does not turn file contents into serializable Model data.

## Metadata and Reading

`File.name`, `File.size`, and `File.mimeType` read browser-provided metadata synchronously. A MIME type may be an empty string when the browser cannot determine it.

`File.readAsText`, `File.readAsDataUrl`, and `File.readAsArrayBuffer` wrap `FileReader` as interruptible Effects. They fail with `FileReadError` when the browser reports an error or returns an unexpected result type. Catch that error inside the Command and convert it into a declared failure Message.

::Snippet{name="fileMetadataAndRead" label="file metadata and read example"}

## Selecting Files

`File.select` and `File.selectMultiple` open a temporary native file input. Both accept a list of MIME types or extensions, which Foldkit forwards to the input's `accept` attribute.

The `accept` list filters the picker UI; it does not validate the selected file. Validate type, size, and contents in your own update and Commands when those constraints matter.

Cancellation is a normal result, not an Effect failure. `File.select` returns `Option.some(file)` after a selection and `Option.none()` after cancellation. `File.selectMultiple` returns all selected files, or an empty array after cancellation. Map either result into domain-specific Messages in the Command.

::Snippet{name="fileSelect" label="file select example"}

## Components

Use [FileDrop](/ui/file-drop) for a headless drop zone with a hidden `<input type="file">`. Its Submodel resets the input so the same file can be selected twice, prevents the browser's default drop behavior, and tracks real drag entry and exit.

FileDrop emits a `ReceivedFiles` OutMessage with a guaranteed non-empty file list. It emits `RejectedNonFiles` when a drop or change contains no files. Fold both variants in the parent update. When FileDrop does not fit the interaction, build directly with the `OnFileChange` and `OnDropFiles` attributes from `foldkit/html`.

::Snippet{name="uiFileDropBasic" label="FileDrop example"}

## Testing

Scene provides `changeFiles` for file inputs and `dropFiles` for drop zones. Each takes a target locator and `ReadonlyArray<File>`, then checks that the matching file-event handler is present before dispatching the synthetic event.

For a button-triggered `File.select` Command, click the button and resolve the Command with the result the picker would have produced. `Command.resolveAll` covers flows where selection immediately starts another Command, such as reading a preview.

::Snippet{name="fileSceneTest" label="file scene test example"}

## Full API Surface

The [File API reference](/api-reference/file) lists the Schema, metadata helpers, readers, selectors, and `FileReadError` signatures.
