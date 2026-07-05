import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import { exampleSourceHref } from '../../link'
import type { TableOfContentsEntry } from '../../main'
import {
  demoContainer,
  heading,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import { uiTabsRouter } from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'
import {
  type DataAttributeEntry,
  type KeyboardEntry,
  type PropEntry,
  dataAttributeTable,
  keyboardTable,
  propTable,
} from '../../view/docTable'
import type { Message } from './message'
import type { Model } from './model'
import * as Nav from './nav'

// TABLE OF CONTENTS

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const examplesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'examples',
  text: 'Examples',
}

const stylingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'styling',
  text: 'Styling',
}

const keyboardInteractionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'keyboard-interaction',
  text: 'Keyboard Interaction',
}

const accessibilityHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'accessibility',
  text: 'Accessibility',
}

const navVsTabsHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'nav-vs-tabs',
  text: 'Nav vs Tabs',
}

const apiReferenceHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'api-reference',
  text: 'API Reference',
}

const viewInputsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'view-inputs',
  text: 'ViewInputs',
}

const renderInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'render-info',
  text: 'RenderInfo',
}

const itemInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'item-info',
  text: 'ItemInfo',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Nav.basicHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  navVsTabsHeader,
  apiReferenceHeader,
  viewInputsHeader,
  renderInfoHeader,
  itemInfoHeader,
]

// SECTION DATA

const viewInputsProps: ReadonlyArray<PropEntry> = [
  {
    name: 'items',
    type: 'ReadonlyArray<Value>',
    description:
      'The nav item values, in display order. When typed via `Nav.view<MyUnion>()`, `Value` is your union (typically a route tag) and each `ItemInfo.value` is typed as `MyUnion`.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description:
      'Accessible label for the navigation landmark. Distinguishes this nav from other landmarks on the page (e.g. “Primary”, “Footer”).',
  },
  {
    name: 'toHref',
    type: '(value: Value, index: number) => string',
    description:
      'Maps each item to its URL. Build these with your routers so the links deep-link and the runtime can drive history.',
  },
  {
    name: 'isItemCurrent',
    type: '(value: Value, index: number) => boolean',
    description:
      'Decides which item is the current page from the active route. A predicate (not equality) so one section can own a whole family of routes.',
  },
  {
    name: 'toView',
    type: '(render: RenderInfo<Value>) => Html',
    description:
      'Callback that receives the `nav` attribute bundle and one `ItemInfo<Value>` per item. Returns the composed layout.',
  },
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'nav',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the navigation landmark. Includes `aria-label`. Spread it onto an `h.nav`, which already supplies the navigation role.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<ItemInfo<Value>>',
    description:
      'One entry per `items`, in the same order. See ItemInfo below.',
  },
]

const itemInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'value',
    type: 'Value',
    description:
      'The item value. Typed as your `Value` union when declared via `Nav.view<Value>()`.',
  },
  {
    name: 'index',
    type: 'number',
    description: 'Position in the `items` array.',
  },
  {
    name: 'isCurrent',
    type: 'boolean',
    description: 'Whether this item is the current page per `isItemCurrent`.',
  },
  {
    name: 'link',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the anchor element. Includes `href`, plus `aria-current="page"` and `data-current` on the current item.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-current',
    condition: 'Present on the anchor of the current item.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Tab',
    description: 'Move focus to the next link. Native browser behavior.',
  },
  {
    key: 'Shift + Tab',
    description: 'Move focus to the previous link. Native browser behavior.',
  },
  {
    key: 'Enter',
    description: 'Follow the focused link. Native browser behavior.',
  },
]

// VIEW

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets; url: Url }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (_model, { copiedSnippets, url }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/nav', 'Nav'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'URL-driven navigation between sections, where each section is a separate route with its own URL, deep-linking, and browser-history behavior. Nav renders a navigation landmark whose items are links, marking the current destination with ',
          inlineCode('aria-current="page"'),
          '.',
        ),
        infoCallout(
          'Switching content without changing the URL?',
          'Reach for ',
          link(uiTabsRouter(), 'Tabs'),
          ' instead. Nav is for URL-driven navigation; Tabs is for swapping panels inside a single page.',
        ),
        infoCallout(
          'See it in an app',
          'The ',
          link(exampleSourceHref('ui-showcase'), 'UI showcase'),
          ' builds its own sidebar with Nav, so every route marks the active link with aria-current.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          Nav.basicHeader.level,
          Nav.basicHeader.id,
          Nav.basicHeader.text,
        ),
        para(
          'Nav is stateless. There is no ',
          inlineCode('Nav.Model'),
          ' and no ',
          inlineCode('Nav.update'),
          ': the current item is derived from the URL via ',
          inlineCode('isItemCurrent'),
          '. Pass the item values, a ',
          inlineCode('toHref'),
          ' that maps each to its route, and a ',
          inlineCode('toView'),
          ' callback that receives one ',
          inlineCode('ItemInfo<Value>'),
          ' per item.',
        ),
        demoContainer(...Nav.basicDemo(url)),
        highlightedCodeBlock(
          h.div(
            [h.Class('text-sm'), h.InnerHTML(Snippet.uiNavBasicHighlighted)],
            [],
          ),
          Snippet.uiNavBasicRaw,
          'Copy nav example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Nav is headless. The ',
          inlineCode('toView'),
          ' callback owns all markup, spreading the attribute bundles onto your own elements. Style the current item with the ',
          inlineCode('data-current'),
          ' attribute, for example ',
          inlineCode('data-[current]:bg-gray-100'),
          '.',
        ),
        dataAttributeTable(dataAttributes),
        heading(
          keyboardInteractionHeader.level,
          keyboardInteractionHeader.id,
          keyboardInteractionHeader.text,
        ),
        para(
          'Nav items are plain links, so keyboard support is the browser’s native link handling. There is no roving tabindex: every link is in the tab order, which is the correct pattern for a navigation landmark (roving tabindex belongs to composite widgets like ',
          link(uiTabsRouter(), 'Tabs'),
          ').',
        ),
        keyboardTable(keyboardEntries),
        heading(
          accessibilityHeader.level,
          accessibilityHeader.id,
          accessibilityHeader.text,
        ),
        para(
          'The ',
          inlineCode('nav'),
          ' bundle carries ',
          inlineCode('aria-label'),
          ', and the wrapping ',
          inlineCode('<nav>'),
          ' element supplies the navigation landmark role. The current item’s anchor receives ',
          inlineCode('aria-current="page"'),
          ', the value the ARIA Authoring Practices Guide recommends for marking the current page within a set of navigation links.',
        ),
        heading(
          navVsTabsHeader.level,
          navVsTabsHeader.id,
          navVsTabsHeader.text,
        ),
        para(
          'Both render a set of selectable items, but the semantics differ. ',
          link(uiTabsRouter(), 'Tabs'),
          ' applies ',
          inlineCode('role="tablist"'),
          ', ',
          inlineCode('role="tab"'),
          ', and ',
          inlineCode('role="tabpanel"'),
          ': it switches content within one page, owns the active index in its Model, and uses roving tabindex with arrow keys. Nav applies the navigation landmark with ',
          inlineCode('aria-current="page"'),
          ': it derives the current item from the URL, holds no state of its own, and leaves each link in the tab order. If each item has its own URL and the browser back button should move between items, use Nav.',
        ),
        heading(
          apiReferenceHeader.level,
          apiReferenceHeader.id,
          apiReferenceHeader.text,
        ),
        heading(
          viewInputsHeader.level,
          viewInputsHeader.id,
          viewInputsHeader.text,
        ),
        para('Configuration object passed to ', inlineCode('Nav.view()'), '.'),
        propTable(viewInputsProps),
        heading(
          renderInfoHeader.level,
          renderInfoHeader.id,
          renderInfoHeader.text,
        ),
        para(
          'Payload delivered to the ',
          inlineCode('toView'),
          ' callback each render.',
        ),
        propTable(renderInfoProps),
        heading(itemInfoHeader.level, itemInfoHeader.id, itemInfoHeader.text),
        para(
          'Each entry in ',
          inlineCode('RenderInfo.items'),
          '. Carries the value, derived current state, and the anchor attribute bundle.',
        ),
        propTable(itemInfoProps),
      ],
    )
  },
)
