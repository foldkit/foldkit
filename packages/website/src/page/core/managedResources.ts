import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div, strong } from '../../html'
import type { Model, TableOfContentsEntry } from '../../main'
import {
  callout,
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippets from '../../snippet'
import { highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const accessingManagedResourcesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessing-managed-resources',
  text: 'Accessing Managed Resources in Commands',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  accessingManagedResourcesHeader,
]

export const view = (model: Model): Html =>
  div(
    [],
    [
      pageTitle('core/managed-resources', 'Managed Resources'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Resources live for the entire application lifecycle. But some resources are heavy and should only be active while the model is in a particular state — a camera stream during a video call, a WebSocket connection while on a chat page, or a Web Worker pool during a computation. ',
        strong([], ['Managed resources']),
        ' provide model-driven acquire/release lifecycle, using the same deps-diffing engine as subscriptions.',
      ),
      para(
        'Define a managed resource identity with ',
        inlineCode('ManagedResource.tag'),
        ', then wire its lifecycle with ',
        inlineCode('makeManagedResources'),
        '. The ',
        inlineCode('modelToMaybeRequirements'),
        ' function returns ',
        inlineCode('Option.some(params)'),
        ' when the resource should be active, and ',
        inlineCode('Option.none()'),
        ' when it should be released.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.managedResourcesHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesRaw,
        'Copy managed resources example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'When requirements change, the runtime handles the lifecycle automatically. If ',
        inlineCode('modelToMaybeRequirements'),
        ' transitions from ',
        inlineCode('Option.none()'),
        ' to ',
        inlineCode('Option.some(params)'),
        ', the resource is acquired and ',
        inlineCode('onAcquired'),
        ' is sent. When it goes back to ',
        inlineCode('Option.none()'),
        ', the resource is released and ',
        inlineCode('onReleased'),
        ' is sent. If the params change while active (e.g. switching cameras), the old resource is released and a new one is acquired with the new params.',
      ),
      para(
        'If acquisition fails, ',
        inlineCode('onAcquireError'),
        ' is sent as a message. The resource daemon continues watching for the next deps change — a failed acquisition does not crash the application.',
      ),
      tableOfContentsEntryToHeader(accessingManagedResourcesHeader),
      para(
        'Commands access the resource value via ',
        inlineCode('.get'),
        '. Since the resource might not be active, ',
        inlineCode('.get'),
        ' can fail with ',
        inlineCode('ResourceNotAvailable'),
        '. The type system enforces this — your command won\u2019t compile unless you handle the error.',
      ),
      highlightedCodeBlock(
        div(
          [
            Class('text-sm'),
            InnerHTML(Snippets.managedResourcesCommandHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesCommandRaw,
        'Copy managed resource command example to clipboard',
        model,
        'mb-8',
      ),
      para(
        'This is the same ',
        inlineCode('catchTag'),
        ' pattern you already use for command errors. If your model correctly gates commands (only dispatching ',
        inlineCode('takePhoto'),
        ' after ',
        inlineCode('AcquiredCamera'),
        ' has been received), the ',
        inlineCode('catchTag'),
        ' is a safety net that never fires. But if your model logic has a bug, you get a graceful error message instead of a crash.',
      ),
      callout(
        'Resources vs Managed Resources',
        para(
          'Use ',
          inlineCode('resources'),
          ' for things that live forever (AudioContext, CanvasRenderingContext2D). Use ',
          inlineCode('managedResources'),
          ' for things tied to a model state (camera streams, WebSocket connections, media recorders).',
        ),
      ),
    ],
  )
