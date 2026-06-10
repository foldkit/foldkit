import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { exampleDetailRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const choosingAnEntryPointHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'choosing-an-entry-point',
  text: 'Choosing an Entry Point',
}

const declaringPortsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'declaring-ports',
  text: 'Declaring Ports',
}

const threeDirectionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'three-directions',
  text: 'Three Communication Directions',
}

const flagsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'flags',
  text: 'Flags: Initial Data In',
}

const inboundHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'inbound-ports',
  text: 'Inbound Ports: a Subscription',
}

const outboundHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'outbound-ports',
  text: 'Outbound Ports: a Command',
}

const embedHandleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-embed-handle',
  text: 'The Embed Handle',
}

const schemaBoundaryHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'the-schema-boundary',
  text: 'The Schema Boundary',
}

const reactHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'embedding-in-react',
  text: 'Embedding in React',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  choosingAnEntryPointHeader,
  declaringPortsHeader,
  threeDirectionsHeader,
  flagsHeader,
  inboundHeader,
  outboundHeader,
  embedHandleHeader,
  schemaBoundaryHeader,
  reactHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/embedding', 'Embedding'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A Foldkit app does not have to own its page. ',
        inlineCode('Runtime.embed'),
        ' starts a program under a host-controlled lifecycle and returns a handle the host uses to communicate with it: for example, a widget inside a React or Vue app, a checkout flow inside a server-rendered page, or an interactive panel inside a larger dashboard. The host controls when the app starts and stops, pushes data in, and receives values out, all without touching the Model or dispatching Messages. The boundary is a set of Schema-typed Ports, modeled on Elm ports.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'embedding' }),
          'embedding example',
        ),
        ' runs everything on this page: a plain TypeScript host page that mounts a ticking widget, pushes a step value in, mirrors the count the widget emits, and unmounts it on demand.',
      ),
      tableOfContentsEntryToHeader(choosingAnEntryPointHeader),
      para(
        'Embedded apps are usually built with ',
        inlineCode('makeElement'),
        ': the view returns ',
        inlineCode('Html'),
        ' and the runtime stays scoped to its container, never touching the document ',
        inlineCode('<head>'),
        ', the URL bar, or anything else the host owns. Use ',
        inlineCode('makeApplication'),
        ' only when the embedded app should own page-level concerns like the document title. ',
        inlineCode('embed'),
        ' accepts programs from both.',
      ),
      tableOfContentsEntryToHeader(declaringPortsHeader),
      para(
        'Ports are declared with ',
        inlineCode('Port.inbound'),
        ' and ',
        inlineCode('Port.outbound'),
        ', grouped in a record, and registered on the program config. The record keys name the ports on the handle:',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.embeddingPortsHighlighted)],
          [],
        ),
        Snippets.embeddingPortsRaw,
        'Copy port declaration example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(threeDirectionsHeader),
      para(
        'Host interop maps onto primitives the architecture already has. Data crosses the boundary in three ways, and each direction reuses the concept that already handles that shape of input or output.',
      ),
      tableOfContentsEntryToHeader(flagsHeader),
      para(
        'Data the app needs once, at startup, enters through ',
        inlineCode('Flags'),
        ', exactly as in a page-owning app. The host passes values when it constructs the program, and ',
        inlineCode('init'),
        ' folds them into the initial Model.',
      ),
      tableOfContentsEntryToHeader(inboundHeader),
      para(
        'Data the host pushes while the app runs arrives on an inbound Port, which the app consumes as a Subscription source. ',
        inlineCode('Port.subscription'),
        ' wraps every value into a Message, so host input drives ',
        inlineCode('update'),
        ' the same way any other external event does:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.embeddingInboundSubscriptionHighlighted),
          ],
          [],
        ),
        Snippets.embeddingInboundSubscriptionRaw,
        'Copy inbound Subscription example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'For a Model-gated entry, build one from ',
        inlineCode('Port.stream'),
        ' inside ',
        inlineCode('Subscription.make'),
        '. Values sent while no Stream for the Port is running are dropped, with one exception: values sent before the first Stream attaches are buffered and delivered to it in order, so sends issued right after ',
        inlineCode('embed'),
        ' are not lost during startup.',
      ),
      tableOfContentsEntryToHeader(outboundHeader),
      para(
        'Values the app announces to the host leave through an outbound Port, written from a Command. ',
        inlineCode('Port.emit'),
        ' is an Effect that encodes the value and delivers it to every subscribed host listener; it composes into the app',
        '’s own Commands like any other Effect:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.embeddingOutboundCommandHighlighted),
          ],
          [],
        ),
        Snippets.embeddingOutboundCommandRaw,
        'Copy outbound Command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'When the program runs without an embed handle (started with ',
        inlineCode('Runtime.run'),
        '), emitting is a no-op, so the same app works embedded and standalone.',
      ),
      tableOfContentsEntryToHeader(embedHandleHeader),
      para(
        inlineCode('Runtime.embed(program)'),
        ' starts the runtime and returns an ',
        inlineCode('EmbedHandle'),
        '. The handle has one entry per declared Port under ',
        inlineCode('ports'),
        ' (inbound Ports get ',
        inlineCode('send'),
        ', outbound Ports get ',
        inlineCode('subscribe'),
        '), plus ',
        inlineCode('dispose'),
        ':',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.embeddingHostHighlighted)],
          [],
        ),
        Snippets.embeddingHostRaw,
        'Copy host wiring example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('dispose'),
        ' ties the runtime to the host’s unmount. It interrupts the runtime and runs all cleanup: Subscriptions, Mounts, and ManagedResources release, in-flight Commands stop, the rendered DOM is removed, and the container element is restored empty in its place, ready for a fresh ',
        inlineCode('embed'),
        '. It is idempotent, and sends on a disposed handle are no-ops, so a host that unmounts and remounts in quick succession stays correct. A program can be embedded once at a time; after ',
        inlineCode('dispose'),
        ', the same program and container can be embedded again.',
      ),
      tableOfContentsEntryToHeader(schemaBoundaryHeader),
      para(
        'Every value that crosses the boundary passes through its Port’s Schema. The host works with the Schema’s Encoded side, the app with the decoded Type: ',
        inlineCode('send'),
        ' validates by decoding, and ',
        inlineCode('Port.emit'),
        ' encodes before delivery. Keep Port Schemas to data that survives encoding, the same discipline as a network payload; functions and DOM references cannot cross. The Model does not cross either: outbound Ports carry facts the app chooses to announce, not state snapshots, so the host never couples to the app’s internal shape.',
      ),
      para(
        'An invalid inbound value never reaches the app. ',
        inlineCode('send'),
        ' returns an ',
        inlineCode('Exit'),
        ' carrying the ',
        inlineCode('SchemaError'),
        ' and logs the rejection, so a typed host gets compile-time checking and an untyped host gets a clear runtime signal, while the app only ever sees values its Schemas accepted.',
      ),
      tableOfContentsEntryToHeader(reactHeader),
      para(
        'The handle is framework-agnostic, and its lifecycle maps directly onto effect hooks. In React, ',
        inlineCode('embed'),
        ' on effect setup and ',
        inlineCode('dispose'),
        ' on cleanup is the whole integration:',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.embeddingReactHostHighlighted),
          ],
          [],
        ),
        Snippets.embeddingReactHostRaw,
        'Copy React host example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
}
