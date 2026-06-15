import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const metadataHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'metadata-and-reading',
  text: 'Metadata and reading',
}

const selectionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'selecting-files',
  text: 'Selecting files',
}

const componentsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'components',
  text: 'Components',
}

const testingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing',
  text: 'Testing',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  metadataHeader,
  selectionHeader,
  componentsHeader,
  testingHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/file', 'File'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('File'),
        ' module wraps the browser file APIs as Effects you can run from a Command. It mirrors the design of Elm’s ',
        inlineCode('elm/file'),
        ' package: file values are opaque, file selection happens imperatively through a Command (not a form event), and file contents are read asynchronously via ',
        inlineCode('FileReader'),
        '.',
      ),
      para(
        'A ',
        inlineCode('File'),
        ' is a direct alias for the browser’s native ',
        inlineCode('File'),
        ' type. You can hold one in your Model with ',
        inlineCode('S.Option(File.File)'),
        '. Foldkit never serializes files, so the schema acts as an opaque guard rather than a parser.',
      ),
      tableOfContentsEntryToHeader(metadataHeader),
      para(
        inlineCode('File.name'),
        ', ',
        inlineCode('File.size'),
        ', and ',
        inlineCode('File.mimeType'),
        ' return metadata synchronously. ',
        inlineCode('File.readAsText'),
        ', ',
        inlineCode('File.readAsDataUrl'),
        ', and ',
        inlineCode('File.readAsArrayBuffer'),
        ' wrap the browser’s ',
        inlineCode('FileReader'),
        ' as Effects that can fail with a ',
        inlineCode('FileReadError'),
        '. Use ',
        inlineCode('readAsDataUrl'),
        ' when you want a preview thumbnail without uploading the file first.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.fileMetadataAndReadHighlighted),
          ],
          [],
        ),
        Snippets.fileMetadataAndReadRaw,
        'Copy file metadata and read example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(selectionHeader),
      para(
        inlineCode('File.select'),
        ' and ',
        inlineCode('File.selectMultiple'),
        ' open the native file picker and resolve with what the user chose. Both take a list of accepted MIME types or extensions. ',
        inlineCode('File.select'),
        ' resolves with ',
        inlineCode('Option.some(file)'),
        ' on a pick or ',
        inlineCode('Option.none()'),
        ' on cancel; ',
        inlineCode('File.selectMultiple'),
        ' resolves with the array of chosen files, empty if the user cancels. Mirrors Elm’s ',
        inlineCode('File.Select.file'),
        ' and ',
        inlineCode('File.Select.files'),
        '.',
      ),
      para(
        'Wrap the Effect in a Command at the call site with ',
        inlineCode('Effect.map'),
        ' to produce your own Message. The ',
        inlineCode('File'),
        ' module never defines Messages, so you keep full control of your domain vocabulary.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.fileSelectHighlighted)],
          [],
        ),
        Snippets.fileSelectRaw,
        'Copy file select example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(componentsHeader),
      para(
        'For drop zones and inline file pickers, reach for ',
        inlineCode('FileDrop'),
        '. It is a Submodel that wires a drop zone and a hidden ',
        inlineCode('<input type="file">'),
        ' together and emits a ',
        inlineCode('ReceivedFiles'),
        ' OutMessage when files arrive (whether dropped or picked through the input). It handles the easy-to-miss details for you: it resets the input so the same file can be picked again, calls ',
        inlineCode('preventDefault'),
        ' on drop, and tracks drag state that flips only on true entry and exit. When you need a shape it does not cover, build directly with the ',
        inlineCode('OnFileChange'),
        ' and ',
        inlineCode('OnDropFiles'),
        ' attributes in ',
        inlineCode('foldkit/html'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.uiFileDropBasicHighlighted),
          ],
          [],
        ),
        Snippets.uiFileDropBasicRaw,
        'Copy FileDrop example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(testingHeader),
      para(
        'Scene tests exercise file flows through two helpers. ',
        inlineCode('Scene.dropFiles'),
        ' dispatches a synthetic drop event on a drop zone (e.g. the root of a ',
        inlineCode('FileDrop'),
        '), and ',
        inlineCode('Scene.changeFiles'),
        ' dispatches a synthetic change event on a file input. Both accept a target locator and a ',
        inlineCode('ReadonlyArray<File>'),
        ', and throw a clear error if the target element does not have the matching file-event handler registered.',
      ),
      para(
        'For button-triggered pickers that use the ',
        inlineCode('File.select'),
        ' Command, scene tests use ',
        inlineCode('Scene.click'),
        ' on the button and then ',
        inlineCode('Scene.Command.resolve'),
        ' to synthesize the result, bypassing the native file picker entirely. Use ',
        inlineCode('Scene.Command.resolveAll'),
        ' when an update returns multiple Commands at once, or when resolving one Command cascades into others, like reading a preview immediately after a successful selection.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.fileSceneTestHighlighted)],
          [],
        ),
        Snippets.fileSceneTestRaw,
        'Copy file scene test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
}
