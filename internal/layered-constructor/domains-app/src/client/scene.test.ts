import { Array, Effect, Option, Result } from 'effect'
import { Scene } from 'foldkit/experimental/layered/testing'
import { modifyFields } from 'foldkit/struct'
import { describe, test } from 'vitest'

import {
  Animation,
  Dialog,
  DialogBlock,
  Listbox,
  VirtualList,
} from '@foldkit/ui'

import { Domain, domainCandidates, domainTlds } from '../shared/domain'
import { makeDomainFixtures } from '../shared/domain.fixture'
import { ApplicationBlock } from './block'
import {
  DismissSearchKeyboard,
  FocusCartButton,
  FocusCartCloseButton,
  FocusFiltersButton,
  FocusSearchInput,
  FocusTldFilterButton,
  ReadCurrentTime,
  ReplaceSearchUrl,
  ScrollPage,
} from './command'
import { DOMAIN_PAGE_SIZE, TOP_RESULT_COUNT } from './domain'
import { DomainsQuery, DomainsQueryFailure } from './domainsQuery'
import { SortListboxBlock, TldListboxBlock } from './filterListboxes'
import { Message } from './message'
import { emptyModel, readyModel, withDomainsForRange } from './model.fixture'
import { PageScrollKey, RESULTS_LIST_ID, ResultsListBlock } from './resultsList'
import { ApplicationRoute } from './route'

const domainResults = Scene.role('region', { name: 'Domain results' })
const allDomainResults = Scene.role('list', { name: 'All domain results' })
const domainResultItems = Scene.filter(Scene.all.role('listitem'), {
  hasNot: Scene.role('list'),
})
const firstDomainResult = Scene.within(
  allDomainResults,
  Scene.first(domainResultItems),
)

const openFilterListbox = (
  name: string,
  id: string,
  listboxMessage: typeof TldListboxBlock.Message,
) => [
  Scene.click(
    Scene.within(
      Scene.selector(`#${id}-button`),
      Scene.role('button', { name: new RegExp(`^${name}`) }),
    ),
  ),
  Scene.Command.resolve(
    Listbox.test.FocusListboxItems({ id }),
    listboxMessage.CompletedFocusListboxItems(),
  ),
  Scene.Mount.resolve(
    Listbox.test.AnchorListbox,
    listboxMessage.CompletedAnchorListbox(),
  ),
  Scene.Mount.resolve(
    Listbox.test.PortalListboxBackdrop,
    listboxMessage.CompletedPortalListboxBackdrop(),
  ),
]

const closeFilterListbox = (
  id: string,
  listboxMessage: typeof TldListboxBlock.Message,
) => [
  Scene.Command.resolve(
    Listbox.test.FocusListboxButton({ id }),
    listboxMessage.CompletedFocusListboxButton(),
  ),
  Scene.Mount.expectEnded(
    Listbox.test.AnchorListbox,
    Listbox.test.PortalListboxBackdrop,
  ),
]

const selectFilterOption = (
  name: string,
  option: string,
  id: string,
  listboxMessage: typeof TldListboxBlock.Message,
) => [
  ...openFilterListbox(name, id, listboxMessage),
  Scene.click(Scene.role('option', { name: option })),
  ...closeFilterListbox(id, listboxMessage),
]

const acknowledgeTldSheetOpen = (generation: number) => [
  Scene.Command.resolve(
    Dialog.test.ShowDialog,
    DialogBlock.Message.SucceededShowDialog(),
  ),
  Scene.Command.resolveAll(
    [
      Animation.test.WaitForPaint,
      Animation.AnimationBlock.Message.CompletedWaitForPaint({ generation }),
    ],
    [
      Animation.test.WaitForPaint,
      Animation.AnimationBlock.Message.CompletedWaitForPaint({ generation }),
    ],
    [
      Animation.test.WaitForAnimationSettled,
      Animation.AnimationBlock.Message.EndedAnimation({ generation }),
    ],
  ),
]

const acknowledgeTldSheetClose = (generation: number) => [
  Scene.Command.resolve(
    Animation.test.WaitForPaint,
    Animation.AnimationBlock.Message.CompletedWaitForPaint({ generation }),
  ),
  Scene.Command.resolve(
    Animation.test.WaitForAnimationSettled,
    Animation.AnimationBlock.Message.EndedAnimation({ generation }),
  ),
  Scene.Command.resolve(
    Dialog.test.CloseDialog,
    DialogBlock.Message.CompletedCloseDialog(),
  ),
  Scene.Command.resolve(
    FocusTldFilterButton,
    Message.CompletedFocusTldFilterButton(),
  ),
]

const resolveResultsListScrolls = <Model, Message, OutMessage>(
  simulation: Scene.SceneSimulation<Model, Message, OutMessage>,
): Scene.SceneSimulation<Model, Message, OutMessage> =>
  Array.reduce(simulation.commands, simulation, (current, command) =>
    Option.match(Scene.Command.argsOf(VirtualList.test.ApplyScroll)(command), {
      onNone: () => current,
      onSome: args =>
        Scene.Command.resolve(
          VirtualList.test.ApplyScroll(args),
          ResultsListBlock.Message.CompletedApplyScroll({
            version: args.version,
            outcome: VirtualList.ApplyScrollOutcome.Skipped(),
          }),
        )(current),
    }),
  )

const resolveSearchPlanningTime =
  (nowMillis = 0) =>
  <Model, Message_, OutMessage>(
    simulation: Scene.SceneSimulation<Model, Message_, OutMessage>,
  ): Scene.SceneSimulation<Model, Message_, OutMessage> =>
    Array.reduce(simulation.commands, simulation, (current, command) =>
      Option.match(Scene.Command.argsOf(ReadCurrentTime)(command), {
        onNone: () => current,
        onSome: args =>
          Scene.Command.resolve(
            ReadCurrentTime(args),
            Message.CompletedReadCurrentTime({ ...args, nowMillis }),
          )(current),
      }),
    )

const resolveDomains =
  (
    domainLabel: string,
    result: Result.Result<ReadonlyArray<Domain>, DomainsQueryFailure>,
    offset = 0,
    limit = TOP_RESULT_COUNT,
  ) =>
  <Model, Message_, OutMessage>(
    simulation: Scene.SceneSimulation<Model, Message_, OutMessage>,
  ) => {
    const args = Option.getOrThrow(
      Array.findFirst(
        Array.getSomes(
          Array.map(
            simulation.commands,
            Scene.Command.argsOf(DomainsQuery.Fetch),
          ),
        ),
        fetch =>
          fetch.args.label === domainLabel &&
          fetch.args.offset === offset &&
          fetch.args.limit === limit,
      ),
    )

    return Scene.Command.resolve(
      DomainsQuery.Fetch(args),
      DomainsQuery.Message.CompletedFetch({
        ...args,
        result,
        completedAtMillis: 0,
      }),
    )(simulation)
  }

const resolveRemainingFirstPageDomains = resolveDomains(
  'acme',
  Result.succeed(
    Array.take(
      Array.drop(makeDomainFixtures('acme'), TOP_RESULT_COUNT),
      DOMAIN_PAGE_SIZE - TOP_RESULT_COUNT,
    ),
  ),
  TOP_RESULT_COUNT,
  DOMAIN_PAGE_SIZE - TOP_RESULT_COUNT,
)

const measureResultsList = Scene.Mount.resolve(
  VirtualList.test.ObserveVirtualList({
    id: RESULTS_LIST_ID,
    scrollContainer: VirtualList.ScrollContainer.Window(),
  }),
  ResultsListBlock.Message.ResizedContainer({
    containerWidth: 1000,
    containerHeight: 400,
  }),
)

describe('domain search', () => {
  test('landing HTML renders skeletons without mounting virtual results', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(emptyModel),
        Scene.expect(Scene.text('Unofficial demo')).toExist(),
        Scene.expect(Scene.role('link', { name: 'Vercel pricing' })).toHaveAttr(
          'href',
          'https://vercel.com/domains/pricing',
        ),
        Scene.expect(Scene.selector('.results-preview')).toExist(),
        Scene.expect(allDomainResults).toBeAbsent(),
        Scene.Mount.expectNone(),
      ),
    )
  })

  test('typing makes Top Results usable before the remaining domain checks complete', async () => {
    await Effect.runPromise(
      Scene.scene(
        {
          block: ApplicationBlock,
          routing: { onUrlChange: Message.ChangedUrl },
        },
        Scene.given(emptyModel),
        Scene.type(Scene.label('Search domains'), 'acme'),
        Scene.Command.resolveAllExact([
          ReplaceSearchUrl({ q: Option.some('acme') }),
          Message.CompletedReplaceSearchUrl(),
        ]),
        Scene.Command.expectNone(),
        Scene.Navigation.changedUrl('/?q=acme'),
        Scene.Command.expectHas(ReadCurrentTime),
        resolveSearchPlanningTime(),
        measureResultsList,
        Scene.inside(
          domainResults,
          Scene.expect(Scene.text(/\$/)).toBeAbsent(),
        ),
        resolveDomains(
          'acme',
          Result.succeed(
            Array.take(makeDomainFixtures('acme'), TOP_RESULT_COUNT),
          ),
        ),
        resolveResultsListScrolls,
        Scene.expect(Scene.label('Search domains')).toHaveValue('acme'),
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('acme.com')).toExist(),
        ),
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('$12.00')).toExist(),
        ),
        Scene.Command.expectHas(ReadCurrentTime),
        resolveSearchPlanningTime(1),
        resolveResultsListScrolls,
        Scene.Command.keepPending(DomainsQuery.Fetch),
        Scene.inside(
          Scene.first(Scene.all.role('article')),
          Scene.expect(Scene.text('$12.00')).toExist(),
          Scene.expect(
            Scene.role('button', { name: 'Add acme.com to cart' }),
          ).toExist(),
          Scene.click(Scene.role('button', { name: 'Add acme.com to cart' })),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Cart, 1 domains' }),
        ).toExist(),
        Scene.expect(
          Scene.text('4 of 556 domains checked · Registration prices in USD'),
        ).toExist(),
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('$80.00')).toBeAbsent(),
        ),
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('$12.00')).toExist(),
        ),
        resolveRemainingFirstPageDomains,
        resolveResultsListScrolls,
        Scene.inside(
          Scene.first(Scene.all.role('article')),
          Scene.expect(Scene.text('$12.00')).toExist(),
        ),
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('$80.00')).toExist(),
        ),
        Scene.expect(
          Scene.text('60 of 556 domains checked · Registration prices in USD'),
        ).toExist(),
        Scene.Command.expectNone(),
      ),
    )
  })

  test('measuring results renders a bounded window of the catalog', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('acme.com')).toExist(),
          Scene.expect(Scene.text('acme.zone')).toBeAbsent(),
        ),
        Scene.expect(allDomainResults).toHaveAttr('tabIndex', '0'),
        Scene.expect(
          Scene.text('556 domains · Registration prices in USD'),
        ).toExist(),
      ),
    )
  })

  test('refresh hides availability, prices, and cart actions until the new result arrives', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.submit(Scene.role('search')),
        Scene.Command.resolve(
          DismissSearchKeyboard,
          Message.CompletedDismissSearchKeyboard(),
        ),
        resolveSearchPlanningTime(),
        resolveResultsListScrolls,
        Scene.inside(
          domainResults,
          Scene.expect(Scene.text(/\$/)).toBeAbsent(),
          Scene.expect(Scene.text('Not available')).toBeAbsent(),
          Scene.expect(
            Scene.role('button', { name: 'Add acme.com to cart' }),
          ).toBeAbsent(),
        ),
        resolveDomains(
          'acme',
          Result.succeed(
            Array.take(makeDomainFixtures('acme'), TOP_RESULT_COUNT),
          ),
        ),
        resolveResultsListScrolls,
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('$12.00')).toExist(),
        ),
        resolveSearchPlanningTime(1),
        resolveRemainingFirstPageDomains,
        resolveResultsListScrolls,
        Scene.Command.expectNone(),
      ),
    )
  })

  test('filters and sorting control the same domain results', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        ...selectFilterOption(
          'Filter by TLD',
          '.app',
          'tld-filter',
          TldListboxBlock.Message,
        ),
        resolveResultsListScrolls,
        Scene.inside(
          allDomainResults,
          Scene.expectAll(domainResultItems).toHaveCount(1),
          Scene.expect(Scene.text('acme.app')).toExist(),
        ),
        ...selectFilterOption(
          'Filter by TLD',
          'All TLDs',
          'tld-filter',
          TldListboxBlock.Message,
        ),
        resolveResultsListScrolls,
        ...selectFilterOption(
          'Sort results',
          'Price: High to Low',
          'sort-order',
          SortListboxBlock.Message,
        ),
        resolveResultsListScrolls,
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('acme.ai')).toExist(),
        ),
        ...selectFilterOption(
          'Sort results',
          'Price: Low to High',
          'sort-order',
          SortListboxBlock.Message,
        ),
        resolveResultsListScrolls,
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('acme.space')).toExist(),
        ),
      ),
    )
  })

  test('failed searches expose a retriable alert without stale prices', async () => {
    await Effect.runPromise(
      Scene.scene(
        {
          block: ApplicationBlock,
          routing: { onUrlChange: Message.ChangedUrl },
        },
        Scene.given(emptyModel),
        Scene.Navigation.changedUrl('/?q=acme'),
        resolveSearchPlanningTime(),
        measureResultsList,
        resolveDomains(
          'acme',
          Result.fail(
            DomainsQueryFailure.make({
              error: 'Search unavailable',
            }),
          ),
        ),
        Scene.Mount.expectEnded(VirtualList.test.ObserveVirtualList),
        resolveResultsListScrolls,
        Scene.expect(Scene.role('alert')).toContainText('Search unavailable'),
        Scene.inside(
          domainResults,
          Scene.expect(Scene.text(/\$/)).toBeAbsent(),
        ),
        Scene.click(Scene.role('button', { name: 'Try again' })),
        Scene.Command.resolve(
          FocusSearchInput,
          Message.CompletedFocusSearchInput(),
        ),
        resolveSearchPlanningTime(),
        measureResultsList,
        resolveDomains(
          'acme',
          Result.succeed(
            Array.take(makeDomainFixtures('acme'), TOP_RESULT_COUNT),
          ),
        ),
        resolveResultsListScrolls,
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('$12.00')).toExist(),
        ),
        resolveSearchPlanningTime(1),
        resolveRemainingFirstPageDomains,
        resolveResultsListScrolls,
        Scene.Command.expectNone(),
      ),
    )
  })
})

describe('filters presentation', () => {
  test('the mobile TLD sheet searches the catalog, applies selection, and resets search when reopened', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.click(Scene.selector('.mobile-tld-filter')),
        ...acknowledgeTldSheetOpen(1),
        Scene.inside(
          Scene.role('dialog', { name: 'Filter by TLD' }),
          Scene.expect(
            Scene.role('searchbox', { name: 'Search TLDs' }),
          ).toHaveValue(''),
          Scene.type(
            Scene.role('searchbox', { name: 'Search TLDs' }),
            'no-such-tld',
          ),
          Scene.expect(Scene.text('No TLDs found.')).toExist(),
          Scene.expect(Scene.role('button', { name: '.academy' })).toBeAbsent(),
          Scene.type(
            Scene.role('searchbox', { name: 'Search TLDs' }),
            ' .AcAdEmY ',
          ),
          Scene.expect(Scene.text('No TLDs found.')).toBeAbsent(),
          Scene.expect(Scene.role('button', { name: '.academy' })).toExist(),
          Scene.expect(Scene.role('button', { name: '.com' })).toBeAbsent(),
          Scene.click(Scene.role('button', { name: '.academy' })),
        ),
        resolveResultsListScrolls,
        ...acknowledgeTldSheetClose(2),
        Scene.expect(
          Scene.role('dialog', { name: 'Filter by TLD' }),
        ).toBeAbsent(),
        Scene.expect(Scene.selector('.mobile-tld-filter')).toHaveText(
          '.academy',
        ),
        Scene.inside(
          allDomainResults,
          Scene.expectAll(domainResultItems).toHaveCount(1),
          Scene.expect(Scene.text('acme.academy')).toExist(),
          Scene.expect(Scene.text('acme.com')).toBeAbsent(),
        ),
        Scene.click(Scene.selector('.mobile-tld-filter')),
        ...acknowledgeTldSheetOpen(3),
        Scene.inside(
          Scene.role('dialog', { name: 'Filter by TLD' }),
          Scene.expect(
            Scene.role('searchbox', { name: 'Search TLDs' }),
          ).toHaveValue(''),
          Scene.expect(Scene.role('button', { name: '.academy' })).toHaveAttr(
            'aria-pressed',
            'true',
          ),
          Scene.expect(Scene.role('button', { name: 'All TLDs' })).toHaveAttr(
            'aria-pressed',
            'false',
          ),
          Scene.click(Scene.role('button', { name: 'All TLDs' })),
        ),
        resolveResultsListScrolls,
        ...acknowledgeTldSheetClose(4),
        Scene.expect(Scene.selector('.mobile-tld-filter')).toHaveText(
          'All TLDs',
        ),
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('acme.com')).toExist(),
          Scene.expect(Scene.text('acme.app')).toExist(),
        ),
        Scene.Command.expectNone(),
      ),
    )
  })

  test('keyboard navigation commits the TLD filter without changing selection during navigation', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        ...openFilterListbox(
          'Filter by TLD',
          'tld-filter',
          TldListboxBlock.Message,
        ),
        Scene.expect(Scene.role('option', { name: 'All TLDs' })).toHaveAttr(
          'aria-selected',
          'true',
        ),
        Scene.keydown(Scene.role('listbox'), 'ArrowDown'),
        Scene.expectHandled(),
        Scene.Command.resolve(
          Listbox.test.ScrollListboxItemIntoView({
            id: 'tld-filter',
            index: 0,
          }),
          TldListboxBlock.Message.CompletedScrollListboxItemIntoView(),
        ),
        Scene.keydown(Scene.role('listbox'), 'ArrowDown'),
        Scene.expectHandled(),
        Scene.Command.resolve(
          Listbox.test.ScrollListboxItemIntoView({
            id: 'tld-filter',
            index: 1,
          }),
          TldListboxBlock.Message.CompletedScrollListboxItemIntoView(),
        ),
        Scene.expect(Scene.role('option', { name: '.com' })).toHaveAttr(
          'data-active',
          '',
        ),
        Scene.expect(Scene.role('option', { name: '.com' })).toHaveAttr(
          'aria-selected',
          'false',
        ),
        Scene.inside(
          allDomainResults,
          Scene.expect(Scene.text('acme.app')).toExist(),
        ),
        Scene.keydown(Scene.role('listbox'), 'Enter'),
        Scene.expectHandled(),
        Scene.Command.resolve(
          Listbox.test.ClickListboxItem({ id: 'tld-filter', index: 1 }),
          TldListboxBlock.Message.CompletedClickListboxItem(),
        ),
        Scene.click(Scene.role('option', { name: '.com' })),
        ...closeFilterListbox('tld-filter', TldListboxBlock.Message),
        resolveResultsListScrolls,
        Scene.expect(Scene.role('listbox')).toBeAbsent(),
        Scene.expect(
          Scene.within(
            Scene.selector('.desktop-tld-filter'),
            Scene.role('button', { name: /^Filter by TLD/ }),
          ),
        ).toHaveText('.com'),
        Scene.inside(
          allDomainResults,
          Scene.expectAll(domainResultItems).toHaveCount(1),
          Scene.expect(Scene.text('acme.com')).toExist(),
          Scene.expect(Scene.text('acme.app')).toBeAbsent(),
        ),
      ),
    )
  })

  test('the filters sheet applies selection to the results and restores its trigger on close', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.click(Scene.role('button', { name: 'Filters and sort' })),
        Scene.Command.resolve(
          Dialog.test.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
        ),
        Scene.Command.resolveAll(
          [
            Animation.test.WaitForPaint,
            Animation.AnimationBlock.Message.CompletedWaitForPaint({
              generation: 1,
            }),
          ],
          [
            Animation.test.WaitForPaint,
            Animation.AnimationBlock.Message.CompletedWaitForPaint({
              generation: 1,
            }),
          ],
          [
            Animation.test.WaitForAnimationSettled,
            Animation.AnimationBlock.Message.EndedAnimation({ generation: 1 }),
          ],
        ),
        Scene.inside(
          Scene.selector('.filters-panel'),
          Scene.expect(Scene.role('button', { name: 'Show All' })).toHaveAttr(
            'aria-pressed',
            'true',
          ),
          Scene.expect(Scene.role('button', { name: 'Relevance' })).toHaveAttr(
            'aria-pressed',
            'true',
          ),
          Scene.expect(Scene.role('listbox')).toBeAbsent(),
          Scene.click(Scene.role('button', { name: 'Price' })),
        ),
        resolveResultsListScrolls,
        Scene.Command.resolve(
          Animation.test.WaitForPaint,
          Animation.AnimationBlock.Message.CompletedWaitForPaint({
            generation: 2,
          }),
        ),
        Scene.Command.resolve(
          Animation.test.WaitForAnimationSettled,
          Animation.AnimationBlock.Message.EndedAnimation({ generation: 2 }),
        ),
        Scene.Command.resolve(
          Dialog.test.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
        ),
        Scene.Command.resolve(
          FocusFiltersButton,
          Message.CompletedFocusFiltersButton(),
        ),
        Scene.expect(Scene.selector('.filters-panel')).toBeAbsent(),
        Scene.expect(firstDomainResult).toHaveText('acme.space$1.99'),
      ),
    )
  })
})

describe('cart presentation', () => {
  test('card and list actions share cart state and totals follow removals', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.inside(
          Scene.first(Scene.all.role('article')),
          Scene.click(Scene.role('button', { name: 'Add acme.com to cart' })),
        ),
        Scene.inside(
          allDomainResults,
          Scene.expect(
            Scene.role('button', { name: 'Remove acme.com from cart' }),
          ).toExist(),
          Scene.click(Scene.role('button', { name: 'Add acme.app to cart' })),
        ),
        Scene.click(Scene.role('button', { name: 'Cart, 2 domains' })),
        Scene.Command.resolve(
          Dialog.test.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
        ),
        Scene.inside(
          Scene.role('region', { name: 'Your cart' }),
          Scene.expect(Scene.text('Registration total$21.99')).toExist(),
          Scene.click(Scene.role('button', { name: 'Remove acme.com' })),
          Scene.Command.resolve(
            FocusCartCloseButton,
            Message.CompletedFocusCartCloseButton(),
          ),
          Scene.expect(Scene.text('Registration total$9.99')).toExist(),
          Scene.click(Scene.role('button', { name: 'Close cart panel' })),
        ),
        Scene.Command.resolve(
          Dialog.test.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
        ),
        Scene.Command.resolve(
          FocusCartButton,
          Message.CompletedFocusCartButton(),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Cart, 1 domains' }),
        ).toExist(),
      ),
    )
  })

  test('unconfirmed domains expose no purchase action', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('foldkit')),
        measureResultsList,
        Scene.expect(
          Scene.role('button', { name: 'Add foldkit.com to cart' }),
        ).toBeAbsent(),
        Scene.expect(
          Scene.role('button', { name: 'Add foldkit.dev to cart' }),
        ).toBeAbsent(),
        Scene.inside(
          firstDomainResult,
          Scene.expect(Scene.text('Not available')).toExist(),
        ),
      ),
    )
  })
})

test('multi-year quotes display and sort by the full registration price', async () => {
  const quotedModel = withDomainsForRange(
    readyModel('acme'),
    {
      label: 'acme',
      offset: 0,
      limit: domainTlds.length,
    },
    Array.map(domainCandidates('acme'), candidate =>
      Option.getOrElse(
        Array.findFirst(
          [
            Domain.Unconfirmed({ name: 'acme.com', tld: 'com' }),
            Domain.Available({
              name: 'acme.ai',
              tld: 'ai',
              price: 160,
              renewalPrice: 170,
              years: 2,
              isPremium: true,
            }),
            Domain.Available({
              name: 'acme.dev',
              tld: 'dev',
              price: 13,
              renewalPrice: 14,
              years: 1,
              isPremium: false,
            }),
          ],
          domain => domain.name === candidate.name,
        ),
        () => Domain.Unconfirmed(candidate),
      ),
    ),
  )

  await Effect.runPromise(
    Scene.scene(
      ApplicationBlock,
      Scene.given(quotedModel),
      measureResultsList,
      Scene.expect(Scene.text('$160.00 / 2 years')).toExist(),
      ...selectFilterOption(
        'Sort results',
        'Price: Low to High',
        'sort-order',
        SortListboxBlock.Message,
      ),
      resolveResultsListScrolls,
      Scene.inside(
        firstDomainResult,
        Scene.expect(Scene.text('acme.dev')).toExist(),
      ),
      ...selectFilterOption(
        'Sort results',
        'Price: High to Low',
        'sort-order',
        SortListboxBlock.Message,
      ),
      resolveResultsListScrolls,
      Scene.inside(
        firstDomainResult,
        Scene.expect(Scene.text('acme.ai')).toExist(),
        Scene.expect(Scene.text('$160.00 / 2 years')).toExist(),
      ),
    ),
  )
})

describe('accessibility', () => {
  test('loading status is atomic and outside the busy results content', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.submit(Scene.role('search')),
        Scene.Command.resolve(
          DismissSearchKeyboard,
          Message.CompletedDismissSearchKeyboard(),
        ),
        resolveSearchPlanningTime(),
        resolveResultsListScrolls,
        Scene.expect(
          Scene.role('status', { name: 'Searching domains' }),
        ).toHaveText('Checking availability and prices…'),
        Scene.expect(Scene.role('status')).toHaveAttr('aria-atomic', 'true'),
        Scene.expect(Scene.selector('[aria-busy]')).toHaveAttr(
          'aria-busy',
          'true',
        ),
        Scene.inside(
          Scene.selector('[aria-busy]'),
          Scene.expect(Scene.role('status')).toBeAbsent(),
        ),
        resolveDomains(
          'acme',
          Result.succeed(
            Array.take(makeDomainFixtures('acme'), TOP_RESULT_COUNT),
          ),
        ),
        resolveResultsListScrolls,
        resolveSearchPlanningTime(1),
        Scene.expect(Scene.selector('[aria-busy]')).toHaveAttr(
          'aria-busy',
          'true',
        ),
        resolveRemainingFirstPageDomains,
        resolveResultsListScrolls,
        Scene.expect(Scene.selector('[aria-busy]')).toHaveAttr(
          'aria-busy',
          'false',
        ),
        Scene.Command.expectNone(),
      ),
    )
  })

  test('invalid input identifies the field and associates its error', async () => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(
          modifyFields(emptyModel, {
            route: () => ApplicationRoute.Search({ q: Option.some('bad!') }),
          }),
        ),
        Scene.expect(Scene.label('Search domains')).toHaveAttr(
          'aria-invalid',
          'true',
        ),
        Scene.expect(Scene.label('Search domains')).toHaveAttr(
          'aria-describedby',
          'search-error',
        ),
        Scene.expect(Scene.selector('#search-error')).toHaveText(
          'Enter a domain name using letters, numbers, and hyphens (up to 63 characters).',
        ),
      ),
    )
  })
})

test('End scrolls through the bound virtual list operation', async () => {
  await Effect.runPromise(
    Scene.scene(
      ApplicationBlock,
      Scene.given(readyModel('acme')),
      measureResultsList,
      Scene.keydown(allDomainResults, 'End'),
      Scene.expectHandled(),
      Scene.Command.expectExact(VirtualList.test.ApplyScroll),
      resolveResultsListScrolls,
    ),
  )
})

test.each(PageScrollKey.literals)(
  '%s in the focused list requests an instant page scroll',
  async key => {
    await Effect.runPromise(
      Scene.scene(
        ApplicationBlock,
        Scene.given(readyModel('acme')),
        measureResultsList,
        Scene.keydown(allDomainResults, key),
        Scene.expectHandled(),
        Scene.Command.expectExact(ScrollPage({ key })),
        Scene.Command.resolve(
          ScrollPage({ key }),
          Message.CompletedScrollPage(),
        ),
      ),
    )
  },
)
