import { Submodel } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { uiShowcaseViewSourceHref } from '../../link'
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
import { uiAnimationRouter } from '../../route'
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
import * as Menu from './menu'
import type { Message } from './message'
import type { Model } from './model'

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

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Menu.basicHeader,
  Menu.animatedHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  outMessageHeader,
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the menu instance.',
  },
  {
    name: 'isAnimated',
    type: 'boolean',
    default: 'false',
    description: 'Enables animation coordination.',
  },
  {
    name: 'isModal',
    type: 'boolean',
    default: 'false',
    description: 'Locks page scroll and marks other elements inert when open.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Menu.Model',
    description: 'The menu state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Menu.Message) => ParentMessage',
    description:
      'Wraps Menu Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'items',
    type: 'ReadonlyArray<Item>',
    description: 'The list of menu items.',
  },
  {
    name: 'itemToConfig',
    type: '(item, context) => ItemConfig',
    description:
      'Maps each item to its className and content. The context provides isActive and isDisabled.',
  },
  {
    name: 'buttonContent',
    type: 'Html',
    description: 'Content rendered inside the trigger button.',
  },
  {
    name: 'isItemDisabled',
    type: '((item, index) => boolean) | undefined',
    description: 'Disables individual menu items.',
  },
  {
    name: 'itemToSearchText',
    type: '((item, index) => string) | undefined',
    description:
      'Optional override for the string typeahead matches against. Defaults to the item itself; override when items carry searchable text distinct from their display content.',
  },
  {
    name: 'isButtonDisabled',
    type: 'boolean | undefined',
    description:
      'Disables the trigger button entirely. The menu cannot be opened while true.',
  },
  {
    name: 'itemGroupKey',
    type: '((item, index) => string) | undefined',
    description: 'Groups contiguous items by key.',
  },
  {
    name: 'groupToHeading',
    type: '((groupKey) => GroupHeading | undefined) | undefined',
    description: 'Renders a heading for each group.',
  },
  {
    name: 'anchor',
    type: 'AnchorConfig | undefined',
    description:
      'Floating positioning config: placement, gap, offset, padding, and portal. The items panel is always anchored to the button; when omitted, the panel uses bottom-start placement. Portaled to the document body by default; pass portal: false to keep the panel inside the wrapper.',
  },
  {
    name: 'buttonClassName',
    type: 'string | undefined',
    description: 'CSS class for the trigger button.',
  },
  {
    name: 'buttonAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description:
      'Extra attributes spread onto the trigger button alongside its built-in click/keyboard handlers and aria-* attributes.',
  },
  {
    name: 'itemsClassName',
    type: 'string | undefined',
    description: 'CSS class for the items container (the panel root).',
  },
  {
    name: 'itemsAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto the items container.',
  },
  {
    name: 'itemsScrollClassName',
    type: 'string | undefined',
    description:
      'CSS class for the inner scrollable wrapper around the item list. Useful for setting max-height/overflow without restyling the panel root.',
  },
  {
    name: 'itemsScrollAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto the inner scrollable wrapper.',
  },
  {
    name: 'backdropClassName',
    type: 'string | undefined',
    description: 'CSS class for the backdrop.',
  },
  {
    name: 'backdropAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto the backdrop element.',
  },
  {
    name: 'groupClassName',
    type: 'string | undefined',
    description: 'CSS class applied to each group wrapper.',
  },
  {
    name: 'groupAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto each group wrapper.',
  },
  {
    name: 'separatorClassName',
    type: 'string | undefined',
    description:
      'CSS class applied to the separator rendered between adjacent groups.',
  },
  {
    name: 'separatorAttributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto each group separator.',
  },
  {
    name: 'className',
    type: 'string | undefined',
    description: 'CSS class applied to the outer Menu root element.',
  },
  {
    name: 'attributes',
    type: 'ReadonlyArray<ChildAttribute> | undefined',
    description: 'Extra attributes spread onto the outer Menu root element.',
  },
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Selected',
    type: '{ value: Item; index: number }',
    description:
      'Emitted when a menu item is selected. Carries both the value (typed as your `Item` union via `Menu.create<Item>()`) and its index into the items array supplied at view time. Menu closes itself on selection; the parent does not need to dispatch Menu.close. Pattern-match the third tuple element of Menu.update in your GotMenuMessage handler to dispatch the corresponding domain action.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-open',
    condition: 'Present on the button when the menu is open.',
  },
  {
    attribute: 'data-active',
    condition: 'Present on the highlighted menu item.',
  },
  { attribute: 'data-disabled', condition: 'Present on disabled menu items.' },
  { attribute: 'data-closed', condition: 'Present during close animation.' },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Enter / Space',
    description: 'Opens the menu (from button) or selects the active item.',
  },
  {
    key: 'Arrow Down',
    description:
      'Opens with first item active (from button) or moves to next item.',
  },
  {
    key: 'Arrow Up',
    description:
      'Opens with last item active (from button) or moves to previous item.',
  },
  { key: 'Home / End', description: 'Moves to the first / last item.' },
  {
    key: 'Escape',
    description: 'Closes the menu and returns focus to the button.',
  },
  {
    key: 'Type a character',
    description: 'Typeahead search: jumps to the matching item.',
  },
]

// VIEW

type ViewInputs = Readonly<{ copiedSnippets: CopiedSnippets }>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { copiedSnippets }): Html => {
    const h = html<Message>()

    return h.div(
      [],
      [
        pageTitle('ui/menu', 'Menu'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'A dropdown menu for actions, like a macOS context menu. Menu is fire-and-forget: it doesn’t track a selected value (use Listbox for persistent selection). It supports typeahead search, drag-to-select, keyboard navigation, grouped items, and anchor positioning.',
        ),
        para(
          'For programmatic control in update functions, use the factory’s ',
          inlineCode('open(model)'),
          ', ',
          inlineCode('close(model)'),
          ', and ',
          inlineCode('selectItem(model, item, index)'),
          ' methods. Each returns the same ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          ' tuple as ',
          inlineCode('update'),
          '.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how Menu is wired up in a ',
          link(uiShowcaseViewSourceHref('menu'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          Menu.basicHeader.level,
          Menu.basicHeader.id,
          Menu.basicHeader.text,
        ),
        para(
          'Pair ',
          inlineCode('view'),
          ' and ',
          inlineCode('update'),
          ' behind ',
          inlineCode('Menu.create<Item>()'),
          ' at module scope. The factory threads your item union through both, so ',
          inlineCode('Selected({ value, index })'),
          ' carries the picked value directly. Menu closes automatically after selection.',
        ),
        demoContainer(...Menu.basicDemo(model.menuBasicDemo)),
        highlightedCodeBlock(
          h.div(
            [h.Class('text-sm'), h.InnerHTML(Snippet.uiMenuBasicHighlighted)],
            [],
          ),
          Snippet.uiMenuBasicRaw,
          'Copy menu example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(
          Menu.animatedHeader.level,
          Menu.animatedHeader.id,
          Menu.animatedHeader.text,
        ),
        para(
          'Pass ',
          inlineCode('isAnimated: true'),
          ' at init for animation coordination.',
        ),
        demoContainer(...Menu.animatedDemo(model.menuAnimatedDemo)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiMenuAnimatedHighlighted),
            ],
            [],
          ),
          Snippet.uiMenuAnimatedRaw,
          'Copy animated menu example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Menu is headless. The ',
          inlineCode('itemToConfig'),
          ' callback controls all item markup. Group items with ',
          inlineCode('itemGroupKey'),
          ' and ',
          inlineCode('groupToHeading'),
          '.',
        ),
        para(
          'The items panel is portaled to the document body and positioned relative to the trigger button with Floating UI. Ancestor stacking contexts and overflow clipping no longer apply, so a clipped container or a sibling overlay wrapper cannot hide an open menu. The panel still stacks at the document level: give it a z-index above elevated content like sticky headers or toasts, as the demos on this page do with ',
          inlineCode('z-10'),
          '. Pass ',
          inlineCode('anchor: { portal: false }'),
          ' to keep the panel inside the wrapper instead.',
        ),
        para(
          'When ',
          inlineCode('isAnimated'),
          ' is true, enter/leave animations flow through the ',
          link(uiAnimationRouter(), 'Animation'),
          ' module. Style with CSS transitions or CSS keyframe animations. Animation advances once every animation on the element has settled.',
        ),
        dataAttributeTable(dataAttributes),
        heading(
          keyboardInteractionHeader.level,
          keyboardInteractionHeader.id,
          keyboardInteractionHeader.text,
        ),
        para(
          'Menu uses ',
          inlineCode('aria-activedescendant'),
          '. Focus stays on the items container while arrow keys update the highlighted item. Typeahead search accumulates characters for 350ms.',
        ),
        keyboardTable(keyboardEntries),
        heading(
          accessibilityHeader.level,
          accessibilityHeader.id,
          accessibilityHeader.text,
        ),
        para(
          'The button receives ',
          inlineCode('aria-haspopup="menu"'),
          ' and ',
          inlineCode('aria-expanded'),
          '. The items container receives ',
          inlineCode('role="menu"'),
          ' with ',
          inlineCode('aria-activedescendant'),
          '. Each item receives ',
          inlineCode('role="menuitem"'),
          '.',
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
        para('Configuration object passed to ', inlineCode('Menu.init()'), '.'),
        propTable(initConfigProps),
        heading(
          viewConfigHeader.level,
          viewConfigHeader.id,
          viewConfigHeader.text,
        ),
        para('Configuration object passed to ', inlineCode('Menu.view()'), '.'),
        propTable(viewConfigProps),
        heading(
          outMessageHeader.level,
          outMessageHeader.id,
          outMessageHeader.text,
        ),
        para(
          'Messages emitted to the parent through the third element of ',
          inlineCode('[Model, Commands, Option<OutMessage>]'),
          '. Pattern-match on the OutMessage in your update handler.',
        ),
        propTable(outMessageProps),
      ],
    )
  },
)
