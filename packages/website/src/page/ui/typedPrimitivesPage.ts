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
  uiComboboxRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiRadioGroupRouter,
} from '../../route'
import * as Snippets from '../../snippet'
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

const primitivesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'primitives',
  text: 'The Three Factories',
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

const radioGroupHeader: TableOfContentsEntry = {
  level: 'h3',
  id: 'radio-group',
  text: 'RadioGroup',
}

const menuExclusionHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'menu-exclusion',
  text: 'Why Menu Has No Factory',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  createFactoryHeader,
  submodelDoesntOwnSelectionHeader,
  soundnessHeader,
  primitivesHeader,
  listboxHeader,
  comboboxHeader,
  radioGroupHeader,
  menuExclusionHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('ui/typed-primitives', 'Foldkit UI Primitives'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit UI ships primitives like ',
        link(uiListboxRouter(), 'Listbox'),
        ', ',
        link(uiComboboxRouter(), 'Combobox'),
        ', and ',
        link(uiRadioGroupRouter(), 'RadioGroup'),
        ' that carry a value type the consumer chooses. A Listbox of plans, a Combobox of cities, a RadioGroup of pricing tiers. Each exposes a ',
        inlineCode('create<Item>()'),
        ' factory that pairs the view and update behind a single type parameter, so the value type is fixed at the binding site and flows into the OutMessage.',
      ),
      para('A Listbox over a literal-union ', inlineCode('Plan'), ' type:'),
      highlightedCodeBlock(
        h.div(
          [h.Class('text-sm'), h.InnerHTML(Snippets.uiListboxBasicHighlighted)],
          [],
        ),
        Snippets.uiListboxBasicRaw,
        'Copy typed Listbox to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      tableOfContentsEntryToHeader(createFactoryHeader),
      para(
        'A call to ',
        inlineCode('Ui.Listbox.create<Plan>()'),
        ' returns an object whose entry points are all bound to ',
        inlineCode('Plan'),
        ': ',
        inlineCode('view'),
        ' accepts ',
        inlineCode('items: ReadonlyArray<Plan>'),
        ', ',
        inlineCode('update'),
        ' returns an OutMessage carrying ',
        inlineCode('item: Plan'),
        ', and the programmatic helpers (',
        inlineCode('selectItem'),
        ', ',
        inlineCode('open'),
        ', ',
        inlineCode('close'),
        ') accept and emit ',
        inlineCode('Plan'),
        ' too. Declare the factory once at module scope and use the same bundle at both the view and update sites.',
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
        inlineCode('item'),
        ' out), and nowhere else. If your app needs the selection to survive across renders, it lives in your Model; if you only care about the moment of commit, the OutMessage is enough on its own.',
      ),
      tableOfContentsEntryToHeader(soundnessHeader),
      para(
        'Without the factory, the view and update would each carry their own ',
        inlineCode('Item'),
        ' type parameter. Nothing would stop a consumer from writing ',
        inlineCode('view: Ui.Listbox.view<Plan>()'),
        ' next to ',
        inlineCode('Ui.Listbox.update<Color>(...)'),
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
        'Internally, each Listbox stores items as opaque tokens and emits the selected one through a single ',
        inlineCode('as unknown as Item'),
        ' cast at the boundary. That cast is sound because the value being emitted came from the same ',
        inlineCode('items'),
        ' array the consumer just supplied. The fence is items in → items out, same type.',
      ),
      tableOfContentsEntryToHeader(primitivesHeader),
      para(
        'Three primitives expose a ',
        inlineCode('create<...>()'),
        ' factory. The shape of the type parameter differs by what the primitive accepts as items.',
      ),
      tableOfContentsEntryToHeader(listboxHeader),
      para(
        inlineCode('Ui.Listbox.create<Item, Value?>()'),
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
        '. ',
        inlineCode('Ui.Listbox.Multi.create<Item, Value?>()'),
        ' has the same shape for multi-select.',
      ),
      tableOfContentsEntryToHeader(comboboxHeader),
      para(
        inlineCode('Ui.Combobox.create<Item>()'),
        ' takes one type parameter and constrains ',
        inlineCode('Item extends string'),
        '. Combobox items are typed strings (a literal union, a branded string type, or plain ',
        inlineCode('string'),
        '). ',
        inlineCode('Ui.Combobox.Multi.create<Item>()'),
        ' is the multi-select variant.',
      ),
      tableOfContentsEntryToHeader(radioGroupHeader),
      para(
        inlineCode('Ui.RadioGroup.create<Value>()'),
        ' takes one type parameter, ',
        inlineCode('Value extends string'),
        '. The view accepts ',
        inlineCode('ReadonlyArray<string>'),
        ' as its options (a literal union ',
        inlineCode('Value'),
        ' is assignable to ',
        inlineCode('string'),
        '), and the OutMessage carries the picked ',
        inlineCode('value: Value'),
        '. The single parameter is enough because RadioGroup options are always inline strings; there is no object form.',
      ),
      tableOfContentsEntryToHeader(menuExclusionHeader),
      para(
        link(uiMenuRouter(), 'Menu'),
        ' deliberately does not expose ',
        inlineCode('create<Item>()'),
        '. Its OutMessage carries ',
        inlineCode('index: number'),
        ' rather than ',
        inlineCode('item: Item'),
        ', so there is no Item type to fix at the binding site. Consumers look up the picked action from their own items array on receipt, e.g. ',
        inlineCode('Array.getUnsafe(actions, index)'),
        '. The Item-generic drift problem the factory solves doesn’t apply to Menu, so the factory would only add ceremony.',
      ),
    ],
  )
}
