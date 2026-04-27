import type { Html } from 'foldkit/html'

import { Class, InnerHTML, div } from '../../html'
import { uiShowcaseViewSourceHref } from '../../link'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import {
  heading,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type PropEntry,
  dataAttributeTable,
  propTable,
} from '../../view/docTable'
import type { Message } from './message'
import type { Model } from './model'
import * as VirtualList from './virtualList'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const exampleHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'example',
  text: 'Example',
}

const subscriptionsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'subscriptions',
  text: 'Subscriptions',
}

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const initConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'init-config',
  text: 'InitConfig',
}

const viewConfigHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-config',
  text: 'ViewConfig',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  exampleHeader,
  subscriptionsHeader,
  stylingHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description:
      'Unique ID for the virtual list instance. Applied to the scrollable container and used by the subscription to attach scroll and resize listeners.',
  },
  {
    name: 'rowHeightPx',
    type: 'number',
    description:
      'Height in pixels of every row. All rows share this height; the value drives spacer math, slice math, and the inline height on row wrappers.',
  },
  {
    name: 'initialScrollTop',
    type: 'number',
    default: '0',
    description:
      'Initial scroll position in pixels. When non-zero, the first MeasuredContainer message issues an apply-scroll Command so the DOM and model agree from the first frame.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'VirtualList.Model',
    description: 'The virtual list state from your parent Model.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description:
      "The full item array. Items live in your Model, not the component's; pass them fresh on each render. Swap, filter, sort, or paginate freely without sending Messages to the list.",
  },
  {
    name: 'itemToKey',
    type: '(item: Item, index: number) => string',
    description:
      'Returns a stable identifier for an item. Used to key rendered rows so the VDOM matches by data identity rather than by position when the visible slice shifts.',
  },
  {
    name: 'itemToView',
    type: '(item: Item, index: number) => Html',
    description:
      "Renders one row's contents. The framework wraps your output in a row-height grid container; use flex or grid with align-items: center inside to vertically center your content.",
  },
  {
    name: 'overscan',
    type: 'number',
    default: '5',
    description:
      'Number of rows mounted above and below the visible viewport. Higher values smooth out fast scroll at the cost of mounting more DOM. react-window uses 1 and react-virtualized uses 3; pick a value that suits the row mount cost.',
  },
  {
    name: 'rowElement',
    type: 'TagName',
    default: "'li'",
    description:
      "HTML tag for each row wrapper. Defaults to li (since the container is rendered as ul). Override only when you also wrap the list in something whose children aren't expected to be li.",
  },
  {
    name: 'className',
    type: 'string',
    description:
      'CSS class applied to the scrollable container. The container needs a constrained height (e.g. h-96) for virtualization to work.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<Attribute<Message>>',
    description:
      'Additional attributes spread onto the scrollable container. Pass extra Style({...}) entries for CSS like overscroll-behavior or scroll-margin, data attributes, or any other Attribute<Message>.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-virtual-list-id',
    condition:
      'Present on the scrollable container. Carries the id from InitConfig so subscriptions and tests can find the right element.',
  },
  {
    attribute: 'data-virtual-list-item-index',
    condition:
      'Present on each rendered row wrapper. Carries the data index of the item being rendered (0-based) so tests and consumer styling can address a specific row.',
  },
]

// VIEW

export const view = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
  copiedSnippets: CopiedSnippets,
): Html =>
  div(
    [],
    [
      pageTitle('ui/virtualList', 'VirtualList'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A virtualization primitive for large lists. Only items inside the viewport plus an overscan buffer are mounted. Spacer divs above and below the visible slice keep the scrollbar physically correct. The demo below manages ten thousand items; only the rows currently visible exist in the DOM.',
      ),
      infoCallout(
        'See it in an app',
        'Check out how VirtualList is wired up in a ',
        link(uiShowcaseViewSourceHref('virtualList'), 'real Foldkit app'),
        '.',
      ),
      heading(exampleHeader.level, exampleHeader.id, exampleHeader.text),
      para(
        'Items live in your Model, not the component, and pass through ',
        inlineCode('ViewConfig.items'),
        ' on each render. The parent owns the data and can swap, filter, sort, or paginate freely without sending Messages to the list. Each item must be keyed via ',
        inlineCode('itemToKey'),
        ' so the VDOM matches rows by data identity, not by position, when the visible slice shifts.',
      ),
      ...VirtualList.virtualListDemo(model.virtualListDemo, toParentMessage),
      highlightedCodeBlock(
        div(
          [Class('text-sm'), InnerHTML(Snippet.uiVirtualListBasicHighlighted)],
          [],
        ),
        Snippet.uiVirtualListBasicRaw,
        'Copy virtual list example to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      heading(
        subscriptionsHeader.level,
        subscriptionsHeader.id,
        subscriptionsHeader.text,
      ),
      para(
        'VirtualList exposes a single subscription, ',
        inlineCode('containerEvents'),
        ', that listens for ',
        inlineCode('scroll'),
        ' events on the container and observes its size with ',
        inlineCode('ResizeObserver'),
        ". Wire it into your app's subscriptions alongside the rest of the framework subscriptions.",
      ),
      heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
      para(
        'The container needs a constrained height for virtualization to work. Without it, the container grows to fit children and never scrolls. Pass ',
        inlineCode('className'),
        ' or ',
        inlineCode('attributes'),
        ' on ',
        inlineCode('ViewConfig'),
        ' to apply the height through your styling system. The component sets only ',
        inlineCode('overflow: auto'),
        ' inline; the rest is yours.',
      ),
      para(
        'VirtualList exposes two data attributes for styling and test selectors: ',
        inlineCode('data-virtual-list-id'),
        ' on the scrollable container and ',
        inlineCode('data-virtual-list-item-index'),
        ' on each rendered row.',
      ),
      dataAttributeTable(dataAttributes),
      heading(
        accessibilityHeader.level,
        accessibilityHeader.id,
        accessibilityHeader.text,
      ),
      para(
        'The container is rendered as ',
        inlineCode('<ul>'),
        ' and each row as ',
        inlineCode('<li>'),
        '. The top and bottom spacer ',
        inlineCode('<li>'),
        ' elements carry ',
        inlineCode('role="presentation"'),
        ' so they do not contribute to the list. Screen readers see only the rows currently mounted; for very long lists, consumers wanting full row count exposure should layer ',
        inlineCode('aria-rowcount'),
        ' / ',
        inlineCode('aria-rowindex'),
        ' via the ',
        inlineCode('attributes'),
        ' prop.',
      ),
      heading(
        apiReferenceHeader.level,
        apiReferenceHeader.id,
        apiReferenceHeader.text,
      ),
      heading(
        initConfigHeader.level,
        initConfigHeader.id,
        initConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('VirtualList.init()'),
        '.',
      ),
      propTable(initConfigProps),
      heading(
        viewConfigHeader.level,
        viewConfigHeader.id,
        viewConfigHeader.text,
      ),
      para(
        'Configuration object passed to ',
        inlineCode('VirtualList.view()'),
        '.',
      ),
      propTable(viewConfigProps),
    ],
  )
