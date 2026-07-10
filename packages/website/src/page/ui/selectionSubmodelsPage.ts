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
  coreSubmodelRouter,
  uiComboboxRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiRadioGroupRouter,
  uiTabsRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const createFactoryHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'create-factory',
  text: 'The create<Item>() Factory',
}

const submodelDoesntOwnSelectionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'submodel-doesnt-own-selection',
  text: 'The Submodel Doesn’t Own Your Selection',
}

const soundnessHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'soundness',
  text: 'Why the Factory Exists',
}

const factoriesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'factories',
  text: 'The Factories',
}

const listboxHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'listbox',
  text: 'Listbox',
}

const comboboxHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'combobox',
  text: 'Combobox',
}

const tabsHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'tabs',
  text: 'Tabs',
}

const menuHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'menu',
  text: 'Menu',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  createFactoryHeader,
  submodelDoesntOwnSelectionHeader,
  soundnessHeader,
  factoriesHeader,
  listboxHeader,
  comboboxHeader,
  tabsHeader,
  menuHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('ui/selection-submodels', 'Selection Submodels'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit UI ships four Submodels for selecting one or more values from a set: ',
        link(uiListboxRouter(), 'Listbox'),
        ', ',
        link(uiComboboxRouter(), 'Combobox'),
        ', ',
        link(uiTabsRouter(), 'Tabs'),
        ', and ',
        link(uiMenuRouter(), 'Menu'),
        '. For example, a Listbox of plans, a Combobox of cities, a Tabs of view modes, or a Menu of actions. ',
        link(uiRadioGroupRouter(), 'RadioGroup'),
        ' is a stateless controlled render helper (like Select, Input, and Textarea), not a Submodel, so it is not covered here.',
      ),
      para(
        'Each exposes a ',
        inlineCode('create<Item>()'),
        ' factory that pairs the view and update behind a single type parameter, so the value type is fixed at the binding site and flows into the OutMessage.',
      ),
      para('A Listbox over a literal-union ', inlineCode('Plan'), ' type:'),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippet.uiListboxBasicHighlighted)],
          [],
        ),
        Snippet.uiListboxBasicRaw,
        'Copy typed Listbox to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(createFactoryHeader),
      para(
        'A call to ',
        inlineCode('Listbox.create<Plan>()'),
        ' returns an object whose entry points are all bound to ',
        inlineCode('Plan'),
        ': ',
        inlineCode('view'),
        ' accepts ',
        inlineCode('items: ReadonlyArray<Plan>'),
        ', ',
        inlineCode('update'),
        ' returns an OutMessage carrying the picked ',
        inlineCode('Plan'),
        ', and the imperative helpers the Submodel exposes (',
        inlineCode('selectItem'),
        ', ',
        inlineCode('open'),
        ', and ',
        inlineCode('close'),
        ' for Listbox and Combobox) accept and emit ',
        inlineCode('Plan'),
        ' too. Declare the factory once at module scope and use the same bundle at every site that needs it.',
      ),
      para(
        'There is no inbound reflect helper for the selection: the parent owns it outright and passes it in as ',
        inlineCode('maybeSelectedValue'),
        ' (',
        inlineCode('selectedValues'),
        ' for multi-select), so there is nothing on the Listbox or Combobox to reflect onto. When an external value (a URL parameter, restored storage, a server push) changes the selection, the parent writes its own field. The ',
        inlineCode('reflect*'),
        ' family lives on the components with configuration the parent feeds in: ',
        inlineCode('reflectMinDate'),
        ', ',
        inlineCode('reflectMaxDate'),
        ', ',
        inlineCode('reflectDisabledDates'),
        ', and ',
        inlineCode('reflectDisabledDaysOfWeek'),
        ' on Calendar and DatePicker, and ',
        inlineCode('reflectRange'),
        ' on Slider. See ',
        link(
          `${coreSubmodelRouter()}#reflecting-external-state`,
          'Reflecting External State',
        ),
        ' for the concept.',
      ),
      tableOfContentsEntryToHeader(submodelDoesntOwnSelectionHeader),
      para(
        'A common first question is: if the Listbox is Item-typed, why does my own Model still hold an ',
        inlineCode('Option<Plan>'),
        ' for the picked value? Isn’t that the same state twice?',
      ),
      para(
        'It isn’t. The Listbox’s Model is UI state: open vs. closed, which option the keyboard is focused on, the typeahead key buffer. It deliberately does not hold the committed selection, because committed selections are domain truth. The Submodel hands you that truth at the moment the user commits via the OutMessage; your update lifts it into your own Model, where it belongs.',
      ),
      para(
        'That split is why the Listbox Model can stay generic-free (no ',
        inlineCode('Listbox.Model<Item>'),
        ') while ',
        inlineCode('Item'),
        ' still flows into your code with full type safety. The generic threads through the boundary (',
        inlineCode('items'),
        ' in, OutMessage ',
        inlineCode('value'),
        ' out), and nowhere else. If the selection needs to persist, store it in your Model. If the commit just dispatches a Command (for example a Menu of actions), no Model field is needed.',
      ),
      tableOfContentsEntryToHeader(soundnessHeader),
      para(
        'Without the factory, the view and update would each carry their own ',
        inlineCode('Item'),
        ' type parameter. Nothing would stop a consumer from writing ',
        inlineCode('view: Listbox.view<Plan>()'),
        ' next to ',
        inlineCode('Listbox.update<Color>(...)'),
        '. Two different type arguments at the same call site. The selected item would arrive in the OutMessage typed as one and the update would believe it was the other, and TypeScript would have no way to flag the mismatch.',
      ),
      para(
        'The factory closes that hole by setting ',
        inlineCode('Item'),
        ' once. The returned ',
        inlineCode('view'),
        ' and ',
        inlineCode('update'),
        ' are bound to the same ',
        inlineCode('Item'),
        ' because both come from the same factory call.',
      ),
      para(
        'Internally, each Submodel’s view and update are written against an untyped string value and then cast back to the consumer’s ',
        inlineCode('Item'),
        ' at the factory boundary. The cast is sound because the value being emitted came from the same ',
        inlineCode('items'),
        ' array the consumer just supplied. The fence is items in → items out, same type.',
      ),
      tableOfContentsEntryToHeader(factoriesHeader),
      para(
        'Each Submodel exposes a ',
        inlineCode('create<...>()'),
        ' factory. The shape of the type parameter differs by what the Submodel accepts as items.',
      ),
      tableOfContentsEntryToHeader(listboxHeader),
      para(
        inlineCode('Listbox.create<Item, Value?>()'),
        ' takes two type parameters. ',
        inlineCode('Item'),
        ' is the shape of the items the consumer supplies. ',
        inlineCode('Value'),
        ' is the shape of the value the OutMessage carries; it defaults to ',
        inlineCode('Item'),
        ' when ',
        inlineCode('Item extends string'),
        ', else ',
        inlineCode('string'),
        '. The two-parameter shape supports object-typed items via an ',
        inlineCode('itemToValue'),
        ' callback that extracts the stringy identifier from each ',
        inlineCode('Item'),
        '.',
      ),
      para(
        inlineCode('Listbox.Multi.create<Item, Value?>()'),
        ' is the multi-select variant. Same type-parameter shape; the ',
        inlineCode('Selected'),
        ' OutMessage carries only the activated ',
        inlineCode('value'),
        ', and the parent toggles that value in and out of the selection it owns.',
      ),
      tableOfContentsEntryToHeader(comboboxHeader),
      para(
        inlineCode('Combobox.create<Item>()'),
        ' takes one type parameter and constrains ',
        inlineCode('Item extends string'),
        '. Combobox items are typed strings (a literal union, a branded string type, or plain ',
        inlineCode('string'),
        ').',
      ),
      para(
        inlineCode('Combobox.Multi.create<Item>()'),
        ' is the multi-select variant. Same type-parameter shape; the ',
        inlineCode('Selected'),
        ' OutMessage carries only the activated ',
        inlineCode('value'),
        ', and the parent toggles that value in and out of the selection it owns.',
      ),
      tableOfContentsEntryToHeader(tabsHeader),
      para(
        inlineCode('Tabs.create<Value>()'),
        ' takes one type parameter, ',
        inlineCode('Value extends string'),
        '. The view accepts ',
        inlineCode('ReadonlyArray<Value>'),
        ' as its tab list (a literal union ',
        inlineCode('Value'),
        ' is assignable to ',
        inlineCode('string'),
        '), and the OutMessage carries both the picked ',
        inlineCode('value: Value'),
        ' and its ',
        inlineCode('index: number'),
        '. The single parameter is enough because Tabs values are always inline strings; there is no object form.',
      ),
      tableOfContentsEntryToHeader(menuHeader),
      para(
        inlineCode('Menu.create<Item>()'),
        ' takes one type parameter, ',
        inlineCode('Item extends string'),
        '. The view accepts ',
        inlineCode('ReadonlyArray<Item>'),
        ' as its menu items, and the OutMessage carries both the picked ',
        inlineCode('value: Item'),
        ' and its ',
        inlineCode('index: number'),
        '. The picked value arrives directly in the OutMessage, so consumers no longer need to look it up from their own items array.',
      ),
    ],
  )
}
