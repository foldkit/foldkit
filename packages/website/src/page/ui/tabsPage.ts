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
import * as Tabs from './tabs'

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

const renderInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'render-info',
  text: 'RenderInfo',
}

const tabInfoHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'tab-info',
  text: 'TabInfo',
}

const outMessageHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'out-message',
  text: 'OutMessage',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  examplesHeader,
  Tabs.horizontalHeader,
  Tabs.verticalHeader,
  stylingHeader,
  keyboardInteractionHeader,
  accessibilityHeader,
  apiReferenceHeader,
  initConfigHeader,
  viewConfigHeader,
  renderInfoHeader,
  tabInfoHeader,
  outMessageHeader,
]

const outMessageProps: ReadonlyArray<PropEntry> = [
  {
    name: 'Selected',
    type: '{ value: Value; index: number }',
    description:
      'Emitted when a tab is committed via click or keyboard. Carries both the tab’s value (typed as your `Value` union via `Tabs.create<Value>()`) and its index. Pattern-match the third tuple element of Tabs.update in your GotTabsMessage handler.',
  },
]

// SECTION DATA

const initConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'id',
    type: 'string',
    description: 'Unique ID for the tabs instance.',
  },
  {
    name: 'activeIndex',
    type: 'number',
    default: '0',
    description: 'Initially active tab index.',
  },
  {
    name: 'activationMode',
    type: "'Automatic' | 'Manual'",
    default: "'Automatic'",
    description:
      'In Automatic mode, arrow keys select tabs on focus. In Manual mode, arrow keys focus only. Enter or Space is required to select.',
  },
]

const viewConfigProps: ReadonlyArray<PropEntry> = [
  {
    name: 'model',
    type: 'Tabs.Model',
    description: 'The tabs state from your parent Model.',
  },
  {
    name: 'toParentMessage',
    type: '(childMessage: Tabs.Message) => ParentMessage',
    description:
      'Wraps Tabs Messages in your parent Message type for Submodel delegation.',
  },
  {
    name: 'tabs',
    type: 'ReadonlyArray<Value>',
    description:
      'The list of tab values, in display order. When the tabs component is declared via `Ui.Tabs.create<MyUnion>()`, `Value` is your union type and each `TabInfo.value` is typed as `MyUnion`.',
  },
  {
    name: 'ariaLabel',
    type: 'string',
    description: 'Accessible label for the tab list.',
  },
  {
    name: 'toView',
    type: '(render: RenderInfo<Value>) => Html',
    description:
      'Callback that receives the `tablist` attribute bundle, one `TabInfo<Value>` per tab, and the current `activeIndex`. Returns the composed layout.',
  },
  {
    name: 'isTabDisabled',
    type: '(value: Value, index: number) => boolean',
    description: 'Disables individual tabs.',
  },
  {
    name: 'orientation',
    type: "'Horizontal' | 'Vertical'",
    default: "'Horizontal'",
    description:
      'Controls arrow key direction and `aria-orientation`. Horizontal uses left/right, vertical uses up/down.',
  },
]

const renderInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'tablist',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the tab list container. Includes `role="tablist"`, `aria-orientation`, and `aria-label`.',
  },
  {
    name: 'tabs',
    type: 'ReadonlyArray<TabInfo<Value>>',
    description:
      'One entry per tab in `viewInputs.tabs`, in the same order. See TabInfo below.',
  },
  {
    name: 'activeIndex',
    type: 'number',
    description:
      'The currently-active tab index. Convenient when the consumer wants to render only the active panel (vs all panels with `hidden` for transitions).',
  },
]

const tabInfoProps: ReadonlyArray<PropEntry> = [
  {
    name: 'value',
    type: 'Value',
    description:
      'The tab value. Typed as your `Value` union when the tabs component is declared via `Ui.Tabs.create<Value>()`.',
  },
  {
    name: 'index',
    type: 'number',
    description: 'Position in the `tabs` array.',
  },
  {
    name: 'isActive',
    type: 'boolean',
    description: 'Whether this tab is currently active.',
  },
  {
    name: 'isFocused',
    type: 'boolean',
    description:
      'Whether this tab owns the roving tabindex (the one in the tab order).',
  },
  {
    name: 'isDisabled',
    type: 'boolean',
    description: 'Whether this tab is disabled via `isTabDisabled`.',
  },
  {
    name: 'tab',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the tab button element. Includes `role="tab"`, `type="button"`, `aria-selected`, `aria-controls`, `tabindex`, the click handler, and the keyboard handler.',
  },
  {
    name: 'panel',
    type: 'ReadonlyArray<ChildAttribute>',
    description:
      'Spread onto the tab panel element. Includes `role="tabpanel"`, `aria-labelledby` pointing back to the tab, and `tabindex`.',
  },
]

const dataAttributes: ReadonlyArray<DataAttributeEntry> = [
  {
    attribute: 'data-selected',
    condition: 'Present on the active tab button and its panel.',
  },
  {
    attribute: 'data-disabled',
    condition: 'Present on disabled tab buttons.',
  },
]

const keyboardEntries: ReadonlyArray<KeyboardEntry> = [
  {
    key: 'Arrow Right / Down',
    description: 'Move to the next tab. In Automatic mode, also selects it.',
  },
  {
    key: 'Arrow Left / Up',
    description:
      'Move to the previous tab. In Automatic mode, also selects it.',
  },
  {
    key: 'Home',
    description: 'Move to the first tab.',
  },
  {
    key: 'End',
    description: 'Move to the last tab.',
  },
  {
    key: 'Enter / Space',
    description:
      'Select the focused tab (Manual mode only; Automatic selects on focus).',
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
        pageTitle('ui/tabs', 'Tabs'),
        tableOfContentsEntryToHeader(overviewHeader),
        para(
          'Tab panel navigation with roving tabindex keyboard support, horizontal and vertical orientation, and automatic or manual activation modes. Tabs renders a tab list with buttons and corresponding panels. Only the active panel is visible.',
        ),
        infoCallout(
          'See it in an app',
          'Check out how Tabs is wired up in a ',
          link(uiShowcaseViewSourceHref('tabs'), 'real Foldkit app'),
          '.',
        ),
        heading(examplesHeader.level, examplesHeader.id, examplesHeader.text),
        heading(
          Tabs.horizontalHeader.level,
          Tabs.horizontalHeader.id,
          Tabs.horizontalHeader.text,
        ),
        para(
          'Declare the tabs component once at module scope with ',
          inlineCode('Ui.Tabs.create<Value>()'),
          ' to lift the tab type through ',
          inlineCode('view'),
          ', ',
          inlineCode('update'),
          ', and ',
          inlineCode('selectTab'),
          ' without casting. Pass the typed ',
          inlineCode('tabs'),
          ' array and a ',
          inlineCode('toView'),
          ' callback that receives one ',
          inlineCode('TabInfo<Value>'),
          ' per tab (with attribute bundles for the tab button and its panel).',
        ),
        demoContainer(...Tabs.horizontalDemo(model.horizontalTabsDemo)),
        highlightedCodeBlock(
          h.div(
            [h.Class('text-sm'), h.InnerHTML(Snippet.uiTabsBasicHighlighted)],
            [],
          ),
          Snippet.uiTabsBasicRaw,
          'Copy tabs example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(
          Tabs.verticalHeader.level,
          Tabs.verticalHeader.id,
          Tabs.verticalHeader.text,
        ),
        para(
          'Pass ',
          inlineCode("orientation: 'Vertical'"),
          ' to switch to up/down arrow navigation.',
        ),
        demoContainer(...Tabs.verticalDemo(model.verticalTabsDemo)),
        highlightedCodeBlock(
          h.div(
            [
              h.Class('text-sm'),
              h.InnerHTML(Snippet.uiTabsVerticalHighlighted),
            ],
            [],
          ),
          Snippet.uiTabsVerticalRaw,
          'Copy vertical tabs example to clipboard',
          copiedSnippets,
          'mb-8',
        ),
        heading(stylingHeader.level, stylingHeader.id, stylingHeader.text),
        para(
          'Tabs is headless. The ',
          inlineCode('toView'),
          ' callback owns all tab and panel markup, spreading the attribute bundles from each ',
          inlineCode('TabInfo'),
          " onto the consumer's elements. A common styling trick is to use a negative margin (",
          inlineCode('mb-[-1px]'),
          ' for horizontal, ',
          inlineCode('mr-[-1px]'),
          ' for vertical) on the active tab to overlap the panel border.',
        ),
        dataAttributeTable(dataAttributes),
        heading(
          keyboardInteractionHeader.level,
          keyboardInteractionHeader.id,
          keyboardInteractionHeader.text,
        ),
        para(
          'Tabs uses roving tabindex: only the focused tab is in the tab order. Arrow direction depends on orientation: left/right for horizontal, up/down for vertical. Disabled tabs are skipped during navigation.',
        ),
        keyboardTable(keyboardEntries),
        heading(
          accessibilityHeader.level,
          accessibilityHeader.id,
          accessibilityHeader.text,
        ),
        para(
          'The tab list receives ',
          inlineCode('role="tablist"'),
          ' with ',
          inlineCode('aria-orientation'),
          ' and ',
          inlineCode('aria-label'),
          '. Each tab button gets ',
          inlineCode('role="tab"'),
          ' with ',
          inlineCode('aria-selected'),
          ' and ',
          inlineCode('aria-controls'),
          ' linking to its panel. Panels receive ',
          inlineCode('role="tabpanel"'),
          ' with ',
          inlineCode('aria-labelledby'),
          ' pointing back to the tab.',
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
        para('Configuration object passed to ', inlineCode('Tabs.init()'), '.'),
        propTable(initConfigProps),
        heading(
          viewConfigHeader.level,
          viewConfigHeader.id,
          viewConfigHeader.text,
        ),
        para('Configuration object passed to ', inlineCode('Tabs.view()'), '.'),
        propTable(viewConfigProps),
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
        heading(tabInfoHeader.level, tabInfoHeader.id, tabInfoHeader.text),
        para(
          'Each entry in ',
          inlineCode('RenderInfo.tabs'),
          '. Carries the value, derived state flags, and attribute bundles for the tab button and its panel.',
        ),
        propTable(tabInfoProps),
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
