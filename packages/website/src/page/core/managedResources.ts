import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { patternsSubscriptionOrganizationRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

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

const composingSubmodelsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'composing-child-submodels',
  text: 'Composing Child Submodels',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  accessingManagedResourcesHeader,
  composingSubmodelsHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/managed-resources', 'Managed Resources'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Resources live for the entire application lifecycle. But some resources are heavy and should only be active while the model is in a particular state, like a camera stream during a video call, a ',
        inlineCode('WebSocket'),
        ' connection while on a chat page, or a Web Worker pool during a computation. ',
        'Managed Resources provide model-driven acquire/release lifecycle, using the same deps-diffing engine as subscriptions.',
      ),
      infoCallout(
        'The restaurant analogy',
        'If resources are kitchen equipment (permanent, always on), Managed Resources are specialty ingredients sourced on demand. When the menu shifts to a seafood special (model state changes), the kitchen orders in fresh lobster and sets up the shellfish station. When the special ends, the lobster goes back to the supplier and the station is broken down. If the chef (Command) tries to plate lobster when it’s not in season, they get a clear signal: ',
        inlineCode('ResourceNotAvailable'),
        '. And if the special changes from Maine lobster to king crab (params change), the old stock is returned and new stock is sourced, just like switching camera resolutions triggers release and reacquire.',
      ),
      para(
        'Define a Managed Resource identity with ',
        inlineCode('ManagedResource.tag'),
        ', then wire its lifecycle with ',
        inlineCode('ManagedResource.make'),
        '. The ',
        inlineCode('modelToMaybeRequirements'),
        ' function returns ',
        inlineCode('Option.some(params)'),
        ' when the resource should be active, and ',
        inlineCode('Option.none()'),
        ' when it should be released.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.managedResourcesHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesRaw,
        'Copy Managed Resources example to clipboard',
        copiedSnippets,
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
        ' is sent as a message. The resource daemon continues watching for the next deps change. A failed acquisition does not crash the application.',
      ),
      tableOfContentsEntryToHeader(accessingManagedResourcesHeader),
      para(
        'Commands access the resource value via ',
        inlineCode('.get'),
        '. Since the resource might not be active, ',
        inlineCode('.get'),
        ' can fail with ',
        inlineCode('ResourceNotAvailable'),
        '. The type system enforces this: your Command won’t compile unless you handle the error.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.managedResourcesCommandHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesCommandRaw,
        'Copy Managed Resource command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'This is the same ',
        inlineCode('catchTag'),
        ' pattern you already use for Command errors. If your model correctly gates Commands (only dispatching ',
        inlineCode('takePhoto'),
        ' after ',
        inlineCode('AcquiredCamera'),
        ' has been received), the ',
        inlineCode('catchTag'),
        ' is a safety net that never fires. But if your model logic has a bug, you get a graceful error message instead of a crash.',
      ),
      tableOfContentsEntryToHeader(composingSubmodelsHeader),
      para(
        'A child Submodel owns its Managed Resources in its own Model and Message terms, built with ',
        inlineCode('ManagedResource.make'),
        ' and knowing nothing about any parent. ',
        inlineCode('ManagedResource.lift'),
        ' translates that record into the parent through a single Model lens and a single Message wrapper, the same shape as update delegation and ',
        inlineCode('Subscription.lift'),
        '. ',
        inlineCode('ManagedResource.aggregate'),
        ' then combines a root-level record with any lifted child records into the single record ',
        inlineCode('makeProgram'),
        ' expects, throwing at startup on duplicate keys.',
      ),
      para(
        'Unlike ',
        inlineCode('Subscription.lift'),
        ', ',
        inlineCode('toChildModel'),
        ' returns an ',
        inlineCode('Option'),
        '. A Managed Resource already speaks in ',
        inlineCode('Option'),
        ' (',
        inlineCode('modelToMaybeRequirements'),
        ' returns ',
        inlineCode('Option.none()'),
        ' to release), so a Submodel embedded as ',
        inlineCode('Option'),
        ' that is not mounted is just another ',
        inlineCode('none'),
        ': a missing child releases the resource through the same channel.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.managedResourcesLiftHighlighted),
          ],
          [],
        ),
        Snippets.managedResourcesLiftRaw,
        'Copy Managed Resources composition example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'These verbs compose across Submodel levels the same way their Subscription counterparts do. The ',
        link(
          patternsSubscriptionOrganizationRouter(),
          'Subscription Organization',
        ),
        ' page traces the full leaf-to-root walkthrough. It uses Subscriptions for its example, but the shape is identical here: ',
        inlineCode('make'),
        ' at each level, ',
        inlineCode('lift'),
        ' each child, ',
        inlineCode('aggregate'),
        ' the results.',
      ),
      infoCallout(
        'Resources vs Managed Resources',
        'Use ',
        inlineCode('resources'),
        ' for things that live forever (',
        inlineCode('AudioContext'),
        ', ',
        inlineCode('CanvasRenderingContext2D'),
        '). Use ',
        inlineCode('managedResources'),
        ' for things tied to a model state (camera streams, ',
        inlineCode('WebSocket'),
        ' connections, media recorders).',
      ),
      para(
        'With resources and Managed Resources, your app can work with any browser API. But what happens when something goes seriously wrong, like an unrecoverable error in update, view, or a Command? The next page covers crash views.',
      ),
    ],
  )
}
