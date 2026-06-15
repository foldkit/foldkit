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
import { aiMcpRouter } from '../../route'
import * as Snippets from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const configurationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'configuration',
  text: 'Configuration',
}

const showHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'show',
  text: 'show',
}

const positionHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'position',
  text: 'position',
}

const modeHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'mode',
  text: 'mode',
}

const bannerHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'banner',
  text: 'banner',
}

const messageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'message',
  text: 'Message',
}

const excludeFromHistoryHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'exclude-from-history',
  text: 'excludeFromHistory',
}

const maxEntriesHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'max-entries',
  text: 'maxEntries',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  configurationHeader,
  showHeader,
  positionHeader,
  modeHeader,
  bannerHeader,
  messageHeader,
  excludeFromHistoryHeader,
  maxEntriesHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('core/devtools', 'DevTools'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit has a DevTools overlay that displays every Message flowing through your app and lets you inspect the Model, Message, Commands, and Mounts at any point in time. It renders inside a shadow DOM so it won’t interfere with your styles or layout.',
      ),
      para(
        'You can see it in action right now. Look for the tab on the bottom right edge of this page.',
      ),
      para(
        'Open the panel and you’ll see a scrolling list of every Message dispatched so far, newest at the bottom. Click any row to inspect it. Four tabs swap the inspector content: ',
        inlineCode('Model'),
        ' shows the full state tree (with changed paths highlighted), ',
        inlineCode('Message'),
        ' shows the payload, ',
        inlineCode('Commands'),
        ' lists the Commands returned by the update, and ',
        inlineCode('Mounts'),
        ' shows which Mounts started or torn down during that render. A ',
        inlineCode('Live'),
        ' badge tells you whether you’re looking at the latest state or a past snapshot; clicking a row in time-travel mode pauses the app and ',
        inlineCode('Resume'),
        ' returns to live. A ',
        inlineCode('Clear'),
        ' button drops history without restarting the app.',
      ),
      infoCallout(
        'AI agent integration',
        'Foldkit also exposes DevTools to AI agents over the Model Context Protocol. See the ',
        link(aiMcpRouter(), 'DevTools MCP'),
        ' page for setup.',
      ),
      para(
        'DevTools are enabled by default in development. Recording and the MCP bridge live in the core runtime, so a ',
        inlineCode('devTools'),
        ' object on ',
        inlineCode('makeApplication'),
        ' is enough for the MCP integration. The in-browser overlay ships separately in ',
        inlineCode('@foldkit/devtools'),
        ': install it and pass its ',
        inlineCode('overlay'),
        ' to mount the panel.',
      ),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.devtoolsBasicHighlighted)],
          [],
        ),
        Snippets.devtoolsBasicRaw,
        'Configuring DevTools',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(configurationHeader),
      para(
        'The ',
        inlineCode('devTools'),
        ' field accepts an object with the following optional properties, or ',
        inlineCode('false'),
        ' to disable DevTools entirely.',
      ),
      tableOfContentsEntryToHeader(showHeader),
      para(
        inlineCode("'Development'"),
        ' (the default) enables DevTools only in development. ',
        inlineCode("'Always'"),
        ' enables them in all environments, including production.',
      ),
      tableOfContentsEntryToHeader(positionHeader),
      para(
        'Controls where the badge and panel appear on screen. One of ',
        inlineCode("'BottomRight'"),
        ' (default), ',
        inlineCode("'BottomLeft'"),
        ', ',
        inlineCode("'TopRight'"),
        ', or ',
        inlineCode("'TopLeft'"),
        '.',
      ),
      tableOfContentsEntryToHeader(modeHeader),
      para(
        inlineCode("'TimeTravel'"),
        ' (the default) enables full time-travel debugging. Clicking a Message row pauses the app and re-renders it exactly as it looked at that point in time. User interaction is blocked while paused, but Subscriptions continue running in the background and new rows keep appearing in the panel. Click Resume to jump back to the live state.',
      ),
      para(
        inlineCode("'Inspect'"),
        ' lets you browse state snapshots without pausing the app, which is useful when showing DevTools to visitors in production or staging environments.',
      ),
      para(
        'You can also pass ',
        inlineCode('{ development, production }'),
        ' to select a different mode per environment. This is the recommended pattern when ',
        inlineCode("show: 'Always'"),
        ' keeps DevTools available in production: keep ',
        inlineCode("'TimeTravel'"),
        ' for local debugging and ship ',
        inlineCode("'Inspect'"),
        ' to your users so clicking a row never pauses their app.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.devtoolsInspectHighlighted),
          ],
          [],
        ),
        Snippets.devtoolsInspectRaw,
        'TimeTravel locally, Inspect in production',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(bannerHeader),
      para(
        'An optional string displayed as a banner at the top of the panel. Useful for welcoming visitors or leaving a note for your team.',
      ),
      tableOfContentsEntryToHeader(messageHeader),
      para(
        'The application’s ',
        inlineCode('Message'),
        ' Schema. Required only for AI agent integration: when set and the running app is connected to the ',
        link(aiMcpRouter(), 'DevTools MCP'),
        ' server, agents can dispatch Messages into the live runtime. The Schema decodes inbound dispatch payloads at the bridge boundary and rejects mismatches with a clean error. Omit this field to disable agent dispatch entirely.',
      ),
      tableOfContentsEntryToHeader(excludeFromHistoryHeader),
      para(
        'A list of Message ',
        inlineCode('_tag'),
        ' values whose dispatches should not be recorded in DevTools history. The Messages still drive ',
        inlineCode('update'),
        ' and the runtime as usual; they just don’t appear in the history panel and don’t pay the per-Message diff cost. Reach for this when an animation-frame Subscription, pointer-move handler, scroll listener, or other high-frequency dispatcher would otherwise flood history with entries that all look the same.',
      ),
      para(
        'When ',
        inlineCode('excludeFromHistory'),
        ' is set, DevTools also switches to a per-entry snapshot strategy so time-travel jumps to recorded entries reflect the real live state at the moment they were recorded. Without this, replay would walk only the kept Messages and miss any cumulative state the excluded ones would have produced. The "Live" model view stays in sync as well: excluded Messages still update the latest-model snapshot, they just don’t append a history entry or compute a diff.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.devtoolsExcludeFromHistoryHighlighted),
          ],
          [],
        ),
        Snippets.devtoolsExcludeFromHistoryRaw,
        'Excluding high-frequency Messages from history',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(maxEntriesHeader),
      para(
        'Maximum number of recorded Messages retained in history before the oldest is evicted. Defaults to ',
        inlineCode('100'),
        '. Clamped to the range ',
        inlineCode('20'),
        ' to ',
        inlineCode('500'),
        ': smaller values keep the panel snappy under high message rates, larger values give you more scroll-back. Each retained entry is one append + diff in the regular case, or one append + full Model snapshot when ',
        inlineCode('excludeFromHistory'),
        ' is active, so memory cost scales with both ',
        inlineCode('maxEntries'),
        ' and your Model size.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippets.devtoolsMaxEntriesHighlighted),
          ],
          [],
        ),
        Snippets.devtoolsMaxEntriesRaw,
        'Raising the DevTools history cap',
        copiedSnippets,
        'mb-8',
      ),
    ],
  )
}
