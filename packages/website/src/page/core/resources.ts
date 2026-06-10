import { Html, html } from 'foldkit/html'

import { Link } from '../../link'
import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
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

const resourcesOrPerCommandHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'resources-or-per-command-provision',
  text: 'Resources or Per-Command Provision',
}

const providingMultipleServicesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'providing-multiple-services',
  text: 'Providing Multiple Services',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  resourcesOrPerCommandHeader,
  providingMultipleServicesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/resources', 'Resources'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Commands are self-contained by default. Each execution starts fresh with no shared state. But some services need a single long-lived instance shared across Commands: browser APIs like ',
        inlineCode('AudioContext'),
        ' or ',
        inlineCode('RTCPeerConnection'),
        ', and clients that do real work at construction time, like an RPC client assembling its protocol stack. That’s what ',
        inlineCode('resources'),
        ' is for.',
      ),
      infoCallout(
        'Think of it like a restaurant kitchen',
        'Resources are kitchen equipment: the oven, the stand mixer, the deep fryer. They’re turned on when the kitchen opens and run all night. Every dish (Command) can use them. You don’t buy a new oven per order. ',
        inlineCode('AudioContext'),
        ' and ',
        inlineCode('CanvasRenderingContext2D'),
        ' are the same: expensive singletons that live for the entire app lifecycle. Need multiple pieces of equipment? Combine them with ',
        inlineCode('Layer.mergeAll'),
        '.',
      ),
      para(
        'Define a service using ',
        link(Link.effectService, 'Context.Service'),
        ', then pass its default layer to ',
        inlineCode('makeApplication'),
        ' via the ',
        inlineCode('resources'),
        ' config field. The runtime builds the Layer once, the first time it is needed: at startup in an app that declares Subscriptions (their pipelines run for the application’s lifetime), otherwise when the first Command runs. The built services are shared for the application’s lifetime and released at teardown. Commands access a service by yielding its tag.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.resourcesHighlighted)],
          [],
        ),
        Snippets.resourcesRaw,
        'Copy resources example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Commands declare their resource requirements in the type signature via the third type parameter of ',
        inlineCode('Command'),
        '. This makes dependencies explicit and type-checked. If a Command requires a service that isn’t provided via ',
        inlineCode('resources'),
        ', you’ll get a compile error.',
      ),
      tableOfContentsEntryToHeader(resourcesOrPerCommandHeader),
      para(
        'A Command can also discharge a requirement itself, with ',
        inlineCode('Effect.provide'),
        ' inside its Effect. Both placements work, so the question is which one a given service should use. Four criteria decide it.',
      ),
      bullets(
        h.span(
          [],
          [
            h.strong([], ['Construction cost times invocation frequency.']),
            ' A per-Command ',
            inlineCode('Effect.provide'),
            ' builds the layer on every invocation. For ',
            inlineCode('FetchHttpClient.layer'),
            ', a thin wrapper around ',
            inlineCode('fetch'),
            ', that costs nothing. For an RPC client that assembles a serialization and transport stack, it means a Command that fires on every keystroke rebuilds the whole stack each time. Services whose construction does real work belong in ',
            inlineCode('resources'),
            ', where construction happens once.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Instance identity.']),
            ' A per-Command provide constructs a fresh instance for each invocation, so Commands never share state through it. When every Command must talk to the same object, like an ',
            inlineCode('AudioContext'),
            ' whose oscillators play into one audio graph, the service belongs in ',
            inlineCode('resources'),
            '.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Failure isolation versus fail-fast.']),
            ' A per-Command provide scopes construction failure to the Commands that use the service: if the layer can’t be built, those Commands fail and the rest of the app keeps working. ',
            inlineCode('resources'),
            ' is the opposite contract. The runtime provides the Layer to every Command, so a Layer that fails to build crashes the app with the crash view. For a service the whole app depends on, that one loud failure is the better behavior; for a genuinely optional service, per-Command provision keeps the failure contained.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Same tag, different implementations.']),
            ' ',
            inlineCode('resources'),
            ' binds each service tag to one implementation for the whole app. Only per-Command provides can give two Commands different implementations of the same tag, like one Command using ',
            inlineCode('KeyValueStore'),
            ' over localStorage while another uses it over sessionStorage.',
          ],
        ),
      ),
      para(
        'Run the criteria over the common cases and the split falls out. ',
        inlineCode('HttpClient'),
        ' stays per-Command: construction is cheap, requests share no state, and the provide is one line. ',
        inlineCode('KeyValueStore'),
        ' stays per-Command: which storage backs the tag is a per-Command decision, and ',
        inlineCode('resources'),
        ' could only pick one. An RPC client goes in ',
        inlineCode('resources'),
        ': construction is expensive, every Command should reuse one client, and when its configuration is broken, one visible failure the first time the client is needed tells you more than every server call failing on its own.',
      ),
      para(
        'Keeping a per-Command provide tidy is a one-line helper. Define ',
        inlineCode('withHttp'),
        ' once, wrap the HTTP-using portion of each Command, and the boilerplate collapses to a single function call per call site.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.resourcesPerCommandHttpHighlighted),
          ],
          [],
        ),
        Snippets.resourcesPerCommandHttpRaw,
        'Copy per-Command HTTP helper to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(providingMultipleServicesHeader),
      para(
        'The ',
        inlineCode('resources'),
        ' field takes a single ',
        inlineCode('Layer'),
        ', but Effect layers compose. Use ',
        inlineCode('Layer.mergeAll'),
        ' to combine multiple service layers into one.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.resourcesMultipleHighlighted),
          ],
          [],
        ),
        Snippets.resourcesMultipleRaw,
        'Copy multiple resources example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Resources live for the entire application. But what if a resource should only exist while the model is in a certain state, like a camera stream during a video call, or a ',
        inlineCode('WebSocket'),
        ' while on a chat page? That’s what Managed Resources are for.',
      ),
    ],
  )
}
