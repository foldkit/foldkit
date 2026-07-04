import { Html, html } from 'foldkit/html'

import { Message, type TableOfContentsEntry } from '../../main'
import {
  bullets,
  infoCallout,
  inlineCode,
  link,
  pageTitle,
  para,
  tableOfContentsEntryToHeader,
} from '../../prose'
import {
  asyncDataRouter,
  bestPracticesImmutabilityRouter,
  comingFromTanStackQueryRouter,
  coreModelRouter,
  exampleDetailRouter,
  patternsRevalidatingCachesRouter,
  patternsRouteDrivenLoadingRouter,
  routingAndNavigationRouter,
  testingStoryRouter,
} from '../../route'
import * as Snippet from '../../snippet'
import { type CopiedSnippets, highlightedCodeBlock } from '../../view/codeBlock'

const overviewHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'overview',
  text: 'Overview',
}

const cacheShapesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'cache-shapes-in-the-model',
  text: 'Cache Shapes in the Model',
}

const perKeyIsolationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'per-key-isolation',
  text: 'Per-Key Isolation',
}

const readingAndWritingHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'reading-and-writing-entries',
  text: 'Reading and Writing Entries',
}

const revalidationHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'revalidation-in-brief',
  text: 'Revalidation, in Brief',
}

const crossScreenWritesHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'cross-screen-writes',
  text: 'Cross-Screen Writes',
}

const testingTheCacheHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'testing-the-cache',
  text: 'Testing the Cache',
}

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = [
  overviewHeader,
  cacheShapesHeader,
  perKeyIsolationHeader,
  readingAndWritingHeader,
  revalidationHeader,
  crossScreenWritesHeader,
  testingTheCacheHeader,
]

export const view = (copiedSnippets: CopiedSnippets): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('patterns/model-as-cache', 'The Model as Cache'),
      para(
        'Your Model is already the single source of truth. This page shows how to make it double as an in-memory query cache built from AsyncData, with no query library in the stack. ',
        link(comingFromTanStackQueryRouter(), 'Coming from TanStack Query'),
        ' makes the case for that trade; this page shows the shapes that deliver it.',
      ),
      infoCallout(
        'Prerequisite',
        'This page builds on ',
        link(asyncDataRouter(), 'Async Data'),
        '. Read that first if the six-state ',
        inlineCode('AsyncData<A, E>'),
        ' value (',
        inlineCode('Idle | Loading | Refreshing | Failure | Stale | Success'),
        ') and its free functions (',
        inlineCode('AsyncData.map'),
        ', ',
        inlineCode('AsyncData.getData'),
        ', ',
        inlineCode('AsyncData.revalidate'),
        ') are unfamiliar.',
      ),
      tableOfContentsEntryToHeader(overviewHeader),
      para(
        'A separate query-cache library exists to solve one problem: server state does not fit in the local state container, so it needs its own store, its own keys, and its own subscription mechanism. Foldkit does not have that problem. The Model already is the single source of truth for the whole app, and update is the only place it changes. Server state is just more state.',
      ),
      para(
        'So instead of reaching for an external cache, you give the Model fields whose type is AsyncData. Each field is one cache entry, or (through ',
        inlineCode('S.HashMap'),
        ') a whole keyed table of them. A load Command’s result settles into a field, view renders the field, and update revalidates it in response to a route change or a mutation. There is no second source of truth to keep in sync, no cache-versus-Model drift, and no library-specific query-key protocol. The cache is the Model, the reducer is update, and the value type is AsyncData.',
      ),
      para(
        'This page is about the shapes: what a cache field looks like in the Model, how a keyed table isolates one entry from another, and how you read and write entries. The mechanics of loading and revalidation are only sketched here and covered in full on their own pages.',
      ),
      tableOfContentsEntryToHeader(cacheShapesHeader),
      para(
        'Four shapes cover the cache needs of a real app, across five cache fields. The Notes app uses them all. Each is a ',
        inlineCode('AsyncData.Schema(dataSchema, errorSchema).schema'),
        ' codec, embedded directly in the Model or wrapped in ',
        inlineCode('S.HashMap'),
        ' for the keyed variants.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheModelHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheModelRaw,
        'Copy model code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para('The four shapes, and when to reach for each:'),
      bullets(
        h.span(
          [],
          [
            h.strong([], ['Single-field list']),
            ' (',
            inlineCode('notebooks'),
            '). One collection the whole app shares, keyed by nothing. Reach for this when there is exactly one of the thing: the sidebar list of notebooks, the current user, a global settings blob. It is a plain ',
            inlineCode('Notebooks.schema'),
            ' field.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['byId table']),
            ' (',
            inlineCode('notebookById'),
            ' and ',
            inlineCode('noteById'),
            '). One AsyncData per entity id, held in an ',
            inlineCode('S.HashMap'),
            ' keyed by that id. Reach for this for detail views: the note viewer loads one Note by its ',
            inlineCode('NoteId'),
            ', and each id gets its own independent entry so viewing note A never disturbs the cached note B. ',
            inlineCode('notebookById'),
            ' holds one Notebook per ',
            inlineCode('NotebookId'),
            ' the same way.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Per-parent table']),
            ' (',
            inlineCode('notesByNotebook'),
            ', an ',
            inlineCode('S.HashMap(NotebookId, ...)'),
            '). One AsyncData list per parent id. Reach for this when a collection is scoped to a parent: the notes belonging to a notebook. Each notebook’s note list loads, fails, and refreshes on its own.',
          ],
        ),
        h.span(
          [],
          [
            h.strong([], ['Cross-cutting feed']),
            ' (',
            inlineCode('allNotes'),
            '). A single list that ignores the parent grouping. Reach for this for an “All Notes” screen that pools notes across every notebook. It is shaped like the single-field list but represents a different query, so it gets its own field rather than sharing ',
            inlineCode('notesByNotebook'),
            '.',
          ],
        ),
      ),
      infoCallout(
        'Error channels',
        'The data Schema and the error Schema are independent per field. ',
        inlineCode('notebooks'),
        ' and ',
        inlineCode('allNotes'),
        ' fail with a bare ',
        inlineCode('string'),
        ', while the id-keyed and parent-keyed fields fail with ',
        inlineCode('S.Union([NotFound, S.String])'),
        ' because a lookup by id can 404. Model the error channel to match what the load Command can actually return.',
      ),
      tableOfContentsEntryToHeader(perKeyIsolationHeader),
      para(
        'A ',
        inlineCode('HashMap'),
        ' cache has one property that makes it safe: a key that was never fetched is simply absent, and absence reads as ',
        inlineCode('Idle'),
        '. You never pre-populate the map with empty entries. Instead every read runs through one convention.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheEntryReaderHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheEntryReaderRaw,
        'Copy entry reader code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        inlineCode('HashMap.get'),
        ' returns ',
        inlineCode('Option<AsyncData<...>>'),
        '. A present key gives ',
        inlineCode('Some(entry)'),
        '; a key never touched gives ',
        inlineCode('None'),
        ', and ',
        inlineCode('AsyncData.getOrIdle'),
        ' collapses that into a real ',
        inlineCode('Idle'),
        ' entry. Two consequences fall out for free:',
      ),
      bullets(
        h.span(
          [],
          [
            'A key that was never fetched reads as ',
            inlineCode('Idle'),
            ', which is exactly the state that calls for a first load. No special-casing “missing” versus “not yet requested”.',
          ],
        ),
        h.span(
          [],
          [
            'Writing a new key with ',
            inlineCode('HashMap.set'),
            ' never clobbers the others. Loading notebook B’s notes adds a B entry and leaves A’s entry, and every other notebook’s entry, byte-for-byte unchanged.',
          ],
        ),
      ),
      para(
        'That second point is the whole reason a keyed table is not just one big AsyncData. Isolation per key is what lets two screens hold two independent load states at once.',
      ),
      tableOfContentsEntryToHeader(readingAndWritingHeader),
      para(
        'Reads and writes over a cache entry use the AsyncData free functions and the plain ',
        inlineCode('HashMap'),
        ' operations. There is no bespoke cache API to learn.',
      ),
      para(
        'To read the data out of an entry for rendering or for a follow-up decision, use ',
        inlineCode('AsyncData.getData'),
        ' (which returns ',
        inlineCode('Option<A>'),
        ', spanning ',
        inlineCode('Success'),
        ', ',
        inlineCode('Refreshing'),
        ', and ',
        inlineCode('Stale'),
        ') or ',
        inlineCode('AsyncData.hasData'),
        ' (a boolean). Because these are free functions over the value, they compose straight through an ',
        inlineCode('Option'),
        ' chain from a ',
        inlineCode('HashMap.get'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheReadDataHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheReadDataRaw,
        'Copy read code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'A write is a pure keyed update: ',
        inlineCode('HashMap.set(table, key, entry)'),
        ' returns a new table, and you set it back on the Model through your struct-update helper. Nothing here is cache-specific. Setting a fresh ',
        inlineCode('Loading'),
        ' entry, a settled ',
        inlineCode('Success'),
        ', or a mid-refresh ',
        inlineCode('Refreshing'),
        ' is the same ',
        inlineCode('HashMap.set'),
        ' call each time; only the AsyncData value differs.',
      ),
      infoCallout(
        'Transforming entries',
        inlineCode('AsyncData.map'),
        ' transforms the held data of every data-bearing state (',
        inlineCode('Success'),
        ', ',
        inlineCode('Refreshing'),
        ', ',
        inlineCode('Stale'),
        ') while preserving the tag, so a pure change to an entry keeps its load status intact. Use ',
        inlineCode('AsyncData.map'),
        ', not a bound ',
        inlineCode('.mapData'),
        '. The mutation helpers that patch an entity into a cache list are covered on ',
        link(
          patternsRevalidatingCachesRouter(),
          'Revalidating Caches After a Mutation',
        ),
        '.',
      ),
      tableOfContentsEntryToHeader(revalidationHeader),
      para(
        'Because the cache lives in the Model, revalidating an entry is a normal update: read the entry, ask whether it should refresh, and if so write the refreshing state and emit the load Command. Foldkit ships this as one combinator, ',
        inlineCode('Update.refresh'),
        ', which expresses it over any of the four shapes.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheRefreshHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheRefreshRaw,
        'Copy refresher code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The engine is ',
        inlineCode('AsyncData.revalidate'),
        ', a free function shared across every shape (not a bound helper). It returns ',
        inlineCode('Some(Refreshing({ data }))'),
        ' for a ',
        inlineCode('Success'),
        ' or ',
        inlineCode('Stale'),
        ' entry and ',
        inlineCode('None'),
        ' otherwise, so a loaded entry revalidates while holding its data and a cold or in-flight entry is left alone. The ',
        inlineCode('read'),
        ' and ',
        inlineCode('write'),
        ' fields are the only per-shape parts: a single-field shape reads ',
        inlineCode('Option.some(model.notebooks)'),
        ', a keyed shape reads ',
        inlineCode('HashMap.get'),
        '. The full treatment, including route-entry ',
        inlineCode('AsyncData.revalidateOrLoad'),
        ' and post-mutation revalidation, is on ',
        link(
          patternsRevalidatingCachesRouter(),
          'Revalidating Caches After a Mutation',
        ),
        '.',
      ),
      tableOfContentsEntryToHeader(crossScreenWritesHeader),
      para(
        'The payoff of one shared Model is that an entity loaded on one screen is instantly visible on another, with no propagation step. When the note viewer loads a Note into ',
        inlineCode('noteById'),
        ', that entry is the same entry the “All Notes” feed and the per-notebook list read from. A mutation that patches the note viewer’s entry is seen by every screen the moment update returns, because they all read the same ',
        inlineCode('HashMap'),
        '.',
      ),
      para(
        'This is why the edit-note flow can revalidate the note and the notebook lists it moved between in one update, regardless of which screen the user is on. There is no “which cache holds this” question and no cross-store invalidation message. Writing the Model is the invalidation. The move case (editing a Note to a different notebook) touches ',
        inlineCode('noteById'),
        ', the old notebook’s ',
        inlineCode('notesByNotebook'),
        ' entry, and the new one, all in the same reducer, and every open view reflects the change on the next render.',
      ),
      tableOfContentsEntryToHeader(testingTheCacheHeader),
      para(
        'Per-key isolation is a claim worth testing directly, because it is the property that separates a keyed cache from a single blob. Two Story tests pin it down. Both drive the real update over a ',
        inlineCode('ChangedUrl'),
        ' Message and assert on the resulting cache entries.',
      ),
      para(
        'The first test proves that navigating to a new key shows ',
        inlineCode('Loading'),
        ' for that key while the old key stays ',
        inlineCode('Success'),
        '.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheNewKeyTestHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheNewKeyTestRaw,
        'Copy new-key test code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'The second test proves that re-entering a cached key goes ',
        inlineCode('Success -> Refreshing'),
        ', keeping the cached list on screen while it refetches.',
      ),
      highlightedCodeBlock(
        h.div(
          [
            h.Class('text-sm'),
            h.InnerHTML(Snippet.modelAsCacheReentryTestHighlighted),
          ],
          [],
        ),
        Snippet.modelAsCacheReentryTestRaw,
        'Copy re-entry test code to clipboard',
        copiedSnippets,
        'mb-8',
      ),
      para(
        'Together they show the cache doing its job: the old key is untouched by a new load (isolation), and a re-entered key stays visible through its refresh (stale-while-revalidate). The shared ',
        inlineCode('notesEntry'),
        ' reader from earlier is what the assertions call, so the test reads an entry exactly the way view does. See ',
        link(testingStoryRouter(), 'Story'),
        ' for the Story harness itself.',
      ),
      para(
        'The ',
        link(
          exampleDetailRouter({ exampleSlug: 'api-cache' }),
          'API Cache example',
        ),
        ' is a runnable app built on the single-field and id-keyed shapes, and ',
        link(comingFromTanStackQueryRouter(), 'Coming from TanStack Query'),
        ' gives the migration framing for this pattern. The ',
        link(coreModelRouter(), 'Model'),
        ' guide covers the single source of truth this pattern extends, and ',
        link(routingAndNavigationRouter(), 'Routing & Navigation'),
        ' covers how update turns route changes into cache reads.',
      ),
      para(
        'From here, ',
        link(patternsRouteDrivenLoadingRouter(), 'Route-Driven Loading'),
        ' picks up ',
        inlineCode('AsyncData.revalidateOrLoad'),
        ' on route entry, and ',
        link(
          patternsRevalidatingCachesRouter(),
          'Revalidating Caches After a Mutation',
        ),
        ' gives the full refresher and mutation-helper treatment. ',
        link(bestPracticesImmutabilityRouter(), 'Immutability'),
        ' explains why ',
        inlineCode('HashMap.set'),
        ' returns a new table.',
      ),
    ],
  )
}
