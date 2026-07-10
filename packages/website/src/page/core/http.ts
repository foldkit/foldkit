import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  apiModuleRouter,
  coreCommandsRouter,
  coreResourcesRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const propagationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'why-propagation-is-off',
  text: 'Why propagation is off',
}

const providingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'providing-it-in-a-command',
  text: 'Providing it in a Command',
}

const customizingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'customizing-the-client',
  text: 'Customizing the client',
}

const fullApiSurfaceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'full-api-surface',
  text: 'Full API surface',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  propagationHeader,
  providingHeader,
  customizingHeader,
  fullApiSurfaceHeader,
]

const httpApiHref = apiModuleRouter({ moduleSlug: 'http' })

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/http', 'Http'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'The ',
        inlineCode('Http'),
        ' module has a single export, ',
        inlineCode('Http.layer'),
        ': Effect’s Fetch-backed ',
        inlineCode('HttpClient'),
        ' with trace header propagation disabled by default. It is the browser-correct client to provide to an HTTP ',
        link(coreCommandsRouter(), 'Command'),
        '. Yield ',
        inlineCode('HttpClient.HttpClient'),
        ' inside the Command and provide ',
        inlineCode('Http.layer'),
        ' at the edge of its Effect.',
      ),
      para(
        'The snippet on this page imports from ',
        inlineCode('effect/unstable/http'),
        '. In the Effect v4 beta that Foldkit pins, the ',
        inlineCode('HttpClient'),
        ' modules live under the unstable namespace, so that import path is expected and matches what Foldkit projects use.',
      ),
      tableOfContentsEntryToHeader(propagationHeader),
      para(
        'Effect’s ',
        inlineCode('HttpClient'),
        ' records an ',
        inlineCode('http.client'),
        ' span for every request and, by default, writes that span’s context onto the request as ',
        inlineCode('traceparent'),
        ' and ',
        inlineCode('b3'),
        ' headers. That default is tuned for servers, where propagating trace context to your own downstream services is desirable. In a browser those same headers make an otherwise CORS-simple request non-simple, so a plain API or a same-origin dev proxy suddenly sees a preflight. ',
        inlineCode('Http.layer'),
        ' defaults propagation off, so requests stay CORS-simple.',
      ),
      para(
        'Local observability is unaffected. Disabling propagation removes only the outgoing ',
        inlineCode('traceparent'),
        ' and ',
        inlineCode('b3'),
        ' request headers: the ',
        inlineCode('http.client'),
        ' span with its method, URL, and status attributes is still recorded, and in a Foldkit app it still nests under the runtime’s Command span.',
      ),
      tableOfContentsEntryToHeader(providingHeader),
      para(
        'Provide ',
        inlineCode('Http.layer'),
        ' per Command with ',
        inlineCode('Effect.provide'),
        '. It is a thin wrapper around ',
        inlineCode('fetch'),
        ', so building it on each invocation costs nothing and the Command stays self-contained. When an app grows many HTTP Commands, or shares a derived client across modules, provide it once through ',
        link(coreResourcesRouter(), 'resources'),
        ' instead.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.counterHttpCommandHighlighted),
          ],
          [],
        ),
        Snippet.counterHttpCommandRaw,
        'Copy HTTP Command example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(customizingHeader),
      para(
        inlineCode('Http.layer'),
        ' folds one overridable default into ',
        inlineCode('FetchHttpClient.layer'),
        ', so every seam Effect’s client exposes still works through it. Supply a custom ',
        inlineCode('fetch'),
        ' by also providing ',
        inlineCode('FetchHttpClient.Fetch'),
        '. An app doing distributed tracing can re-enable propagation for one Command with ',
        inlineCode(
          'Effect.provideService(HttpClient.TracerPropagationEnabled, true)',
        ),
        '. Add auth headers, a base URL, or retries by transforming the client with ',
        inlineCode('HttpClient.mapRequest'),
        ' at the call site. You would write your own layer only for a transport that is not ',
        inlineCode('fetch'),
        ', which is unusual in the browser.',
      ),
      tableOfContentsEntryToHeader(fullApiSurfaceHeader),
      para(
        'The ',
        link(httpApiHref, 'Http API reference'),
        ' lists the export with its full signature.',
      ),
    ],
  )
}
