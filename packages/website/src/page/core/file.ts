import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
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

const formEventsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'form-event-attributes',
  text: 'Form event attributes',
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
  formEventsHeader,
  testingHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html =>
  div(
    [],
    [
      pageTitle('core/file', 'File'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('File'),
        ' module wraps the browser file APIs as Effects you can run from a Command. It mirrors the design of Elm\u2019s ',
        inlineCode('elm/file'),
        ' package: file values are opaque, file selection happens imperatively through a Command (not a form event), and file contents are read asynchronously via ',
        inlineCode('FileReader'),
        '.',
      ),
      para(
        'A ',
        inlineCode('File'),
        ' is a direct alias for the browser\u2019s native ',
        inlineCode('File'),
        ' type. You can hold one in your Model with ',
        inlineCode('S.OptionFromSelf(File.File)'),
        ' \u2014 Foldkit never serializes files, so the schema acts as an opaque guard rather than a parser.',
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
        ' wrap the browser\u2019s ',
        inlineCode('FileReader'),
        ' as Effects that can fail with a ',
        inlineCode('FileReadError'),
        '. Use ',
        inlineCode('readAsDataUrl'),
        ' when you want a preview thumbnail without uploading the file first.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.fileMetadataAndReadHighlighted),
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
        ' open the native file picker and resolve with the files the user chose. Both take a list of accepted MIME types or extensions and resolve with an empty array if the user cancels. Mirrors Elm\u2019s ',
        inlineCode('File.Select.file'),
        ' and ',
        inlineCode('File.Select.files'),
        '.',
      ),
      para(
        'Wrap the Effect in a Command at the call site with ',
        inlineCode('Effect.map'),
        ' to produce your own Message \u2014 the ',
        inlineCode('File'),
        ' module never defines Messages, so you keep full control of your domain vocabulary.',
      ),
      highlightedCodeBlock(
        div([Class('text-sm'), InnerHTML(Snippets.fileSelectHighlighted)], []),
        Snippets.fileSelectRaw,
        'Copy file select example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(formEventsHeader),
      para(
        'Two event attributes in the ',
        inlineCode('foldkit/html'),
        ' module let you read files from form inputs and drag-and-drop zones. ',
        inlineCode('OnFileChange'),
        ' decodes ',
        inlineCode('event.target.files'),
        ' on an ',
        inlineCode('<input type="file">'),
        ' and resets the input value so the same file can be selected twice in a row. ',
        inlineCode('OnDropFiles'),
        ' decodes ',
        inlineCode('event.dataTransfer.files'),
        ' on a drop event and calls ',
        inlineCode('preventDefault'),
        ' for you.',
      ),
      para(
        'Drop zones still need ',
        inlineCode('OnDragOver'),
        ' to enable dropping in the browser, and you can use ',
        inlineCode('OnDragEnter'),
        '/',
        inlineCode('OnDragLeave'),
        ' for visual feedback.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.fileFormEventsHighlighted)],
          [],
        ),
        Snippets.fileFormEventsRaw,
        'Copy file form events example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(testingHeader),
      para(
        'Scene tests exercise ',
        inlineCode('OnFileChange'),
        ' and ',
        inlineCode('OnDropFiles'),
        ' through two dedicated helpers: ',
        inlineCode('Scene.changeFiles'),
        ' dispatches a synthetic change event on a file input, and ',
        inlineCode('Scene.dropFiles'),
        ' dispatches a synthetic drop event on a drop zone. Both accept a target locator and a ',
        inlineCode('ReadonlyArray<File>'),
        '.',
      ),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippets.fileSceneTestHighlighted)],
          [],
        ),
        Snippets.fileSceneTestRaw,
        'Copy file scene test example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
