import type { Html } from 'foldkit/html'

import { div } from '../../html'
import type { TableOfContentsEntry } from '../../main'
import {
  inlineCode,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const scopeHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'scope',
  text: 'Scope',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  scopeHeader,
]

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('core/freeze-model', 'Freeze Model'),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'Foldkit treats the Model as immutable, but TypeScript’s ',
        inlineCode('readonly'),
        ' is a compile-time hint, not a runtime guarantee. Code like ',
        inlineCode('model.items.push(newItem)'),
        ' still runs. When it does, reference equality no longer detects the change, so subscriptions may not fire and the DOM patch can skip nodes that should have updated.',
      ),
      para(
        'To catch mutations early, Foldkit deep-freezes the Model after ',
        inlineCode('init'),
        ' and after every ',
        inlineCode('update'),
        '. Any accidental write throws a ',
        inlineCode('TypeError'),
        ' at the exact call site with a clear stack trace, instead of silently corrupting state.',
      ),
      para(
        'Freezing runs in dev mode (gated behind ',
        inlineCode('import.meta.hot'),
        '), so there is zero runtime cost in production builds. Set ',
        inlineCode('freezeModel'),
        ' to ',
        inlineCode('false'),
        ' to disable it entirely.',
      ),
      tableOfContentsEntryToHeader(scopeHeader),
      para(
        'Freezing is scoped to plain objects and arrays. Effect-tagged values such as ',
        inlineCode('Option'),
        ', ',
        inlineCode('Either'),
        ', ',
        inlineCode('DateTime'),
        ', ',
        inlineCode('HashSet'),
        ', ',
        inlineCode('HashMap'),
        ', and ',
        inlineCode('Chunk'),
        ' are left untouched because they rely on ',
        inlineCode('Hash.cached'),
        ', which lazily writes to the instance on the first ',
        inlineCode('Equal.equals'),
        ' or ',
        inlineCode('Hash.hash'),
        ' call. Freezing them would crash legitimate Effect operations. ',
        inlineCode('Date'),
        ', ',
        inlineCode('Map'),
        ', ',
        inlineCode('Set'),
        ', ',
        inlineCode('File'),
        ', and class instances are also left alone for the same reason.',
      ),
      para(
        inlineCode('Option.some'),
        ' is special-cased: the wrapper stays intact so ',
        inlineCode('Hash.cached'),
        ' still works, but the payload inside is frozen. So ',
        inlineCode('Option.some({ items: [...] })'),
        ' still throws if you try to mutate the inner array.',
      ),
      para(
        'Messages are never frozen. They routinely carry ',
        inlineCode('OptionFromSelf'),
        ' and ',
        inlineCode('DateTimeFromSelf'),
        ' payloads that rely on the same ',
        inlineCode('Hash.cached'),
        ' mechanism, and they’re short-lived enough that the dev-time safety value is low.',
      ),
      para(
        'Cost is amortized to O(diff) per update: already-frozen values are short-circuited, and ',
        inlineCode('evo'),
        ' preserves unchanged branches by reference, so each update only pays to freeze the newly-created nodes.',
      ),
    ],
  )
