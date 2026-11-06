import {
  Array,
  Deferred,
  Effect,
  Option,
  Queue,
  Ref,
  Stream,
  pipe,
} from 'effect'
import * as Mount from 'foldkit/mount'
import * as Story from 'foldkit/story'
import { it as baseIt, describe, expect, expectTypeOf, vi } from 'vitest'

import { makeMethods } from '@effect/vitest'

import {
  ApplyScroll,
  ApplyScrollOutcome,
  EffectsLayer,
  HistoryPage,
  type HistoryPrependInput,
  type HistoryRows,
  Message,
  type Model,
  ObserveVirtualList,
  ObservedAnchor,
  type ScrollAlignment,
  ScrollContainer,
  ScrollTarget,
  type ScrollToOptions,
  layer,
  makeBlock,
} from './virtualList.js'

type HistoryItem = Readonly<{ key: string; estimatedHeightPx: number }>
const HistoryBlock = makeBlock<HistoryItem>()
type VirtualListOperations = Pick<
  Story.TestBlock<typeof HistoryBlock>,
  'init' | 'update' | 'operations'
>
type ScrollReturn = ReturnType<
  VirtualListOperations['operations']['requestScrollToIndex']
>

const programmaticEndSnapshot = {
  scrollTop: 900,
  scrollHeight: 1_000,
  containerHeight: 100,
  anchor: ObservedAnchor.Row({
    key: 'last-window-start',
    index: 29,
    viewportOffset: 0,
  }),
}

const makeFixture = ({ init, update, operations }: VirtualListOperations) => {
  const {
    requestScrollTo: scrollTo,
    requestScrollToEnd: scrollToEnd,
    requestScrollToIndex: scrollToIndex,
    requestScrollToKey: scrollToKey,
    requestScrollToOffset: scrollToOffset,
  } = operations
  const defaultInit = (): Model => init({ id: 'test', rowHeightPx: 30 }).model

  const informOfItemsChanged = operations.informOfItemsChanged

  const historyRows: HistoryRows<HistoryItem> = {
    itemToKey: (item: HistoryItem) => item.key,
    dynamicRowHeights: true,
    itemToEstimatedRowHeightPx: (item: HistoryItem) => item.estimatedHeightPx,
  }

  const historyInit = (reservePx = 1000): Model =>
    init({
      id: 'test',
      rowHeightPx: 30,
      history: { reservePx, prefetchViewports: 4 },
    }).model

  const activeHistoryModel = (reservePx = 1000): Model =>
    update(
      historyInit(reservePx),
      Message.ApproachedLoadedStart({
        distanceToLoadedStartPx: 0,
        containerHeight: 100,
      }),
    ).model

  const prependHistory = (
    model: Model,
    itemKeys: ReadonlyArray<string>,
    prependedItems: ReadonlyArray<HistoryItem>,
    page: HistoryPage = HistoryPage.More(),
  ) =>
    operations.informOfHistoryPrepended(model, {
      items: Array.map(itemKeys, key =>
        pipe(
          prependedItems,
          Array.findFirst(item => item.key === key),
          Option.getOrElse(() => ({ key, estimatedHeightPx: 30 })),
        ),
      ),
      prependedItems,
      itemToKey: historyRows.itemToKey,
      page,
    })

  const runMountedScroll = (
    scrollReturn: ScrollReturn,
    element: HTMLElement,
  ): Promise<number> =>
    Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const maybeCommand = pipe(scrollReturn.commands ?? [], Array.head)
          if (Option.isNone(maybeCommand)) {
            throw new Error('Expected one scroll Command')
          }

          const mounted = yield* Deferred.make<void>()
          yield* ObserveVirtualList({ id: scrollReturn.model.id })
            .f(element, Mount.liveViewStateChanges)
            .pipe(
              Stream.runForEach(() => Deferred.succeed(mounted, undefined)),
              Effect.forkScoped,
            )
          yield* Deferred.await(mounted)
          const maybeArgs = Story.Command.argsOf(ApplyScroll)(
            maybeCommand.value,
          )
          if (Option.isNone(maybeArgs)) {
            throw new Error('Expected the original ApplyScroll Command')
          }

          yield* ApplyScroll(maybeArgs.value).effect

          return element.scrollTop
        }),
      ).pipe(Effect.provide(EffectsLayer)),
    )

  const executeScroll = async (
    scrollReturn: ScrollReturn,
    currentScrollTop: number,
    containerHeight: number,
    rows: ReadonlyArray<
      Readonly<{ index: number; key: string; start: number; height: number }>
    > = [],
    scrollHeight = 1000,
    activeScrollVersion = scrollReturn.model.pendingScrollVersion,
  ): Promise<number> => {
    const element = createScrollElement(
      currentScrollTop,
      containerHeight,
      rows,
      scrollHeight,
      activeScrollVersion,
    )
    document.body.append(element)

    try {
      return await runMountedScroll(scrollReturn, element)
    } finally {
      element.remove()
    }
  }

  const completedEnd = () => {
    const requested = scrollToEnd(defaultInit())
    return update(
      requested.model,
      Message.CompletedApplyScroll({
        version: requested.model.pendingScrollVersion,
        outcome: ApplyScrollOutcome.Applied(programmaticEndSnapshot),
      }),
    ).model
  }

  return {
    init,
    update,
    operations,
    defaultInit,
    informOfItemsChanged,
    historyRows,
    historyInit,
    activeHistoryModel,
    prependHistory,
    scrollTo,
    scrollToEnd,
    scrollToIndex,
    scrollToKey,
    scrollToOffset,
    executeScroll,
    runMountedScroll,
    completedEnd,
  }
}

const it = makeMethods(
  baseIt.extend<{ virtualList: ReturnType<typeof makeFixture> }>({
    virtualList: async ({}, use) =>
      Effect.runPromise(
        Story.withBlock(HistoryBlock, virtualList =>
          Effect.promise(() => use(makeFixture(virtualList))),
        ).pipe(Effect.provide(layer)),
      ),
  }),
)

const createScrollElement = (
  currentScrollTop: number,
  containerHeight: number,
  rows: ReadonlyArray<
    Readonly<{ index: number; key: string; start: number; height: number }>
  >,
  scrollHeight: number,
  activeScrollVersion: number,
  borderTop = 0,
): HTMLElement => {
  const element = document.createElement('div')
  element.id = 'test'
  element.scrollTop = currentScrollTop
  element.scrollTo = options => {
    if (typeof options === 'object' && options.top !== undefined) {
      element.scrollTop = options.top
    }
  }
  element.setAttribute(
    'data-virtual-list-scroll-version',
    String(activeScrollVersion),
  )
  Object.defineProperty(element, 'clientHeight', { value: containerHeight })
  Object.defineProperty(element, 'clientTop', { value: borderTop })
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight })
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      top: 0,
      bottom: containerHeight + borderTop,
      height: containerHeight + borderTop,
      left: 0,
      right: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
  for (const row of rows) {
    const rowElement = document.createElement('div')
    rowElement.setAttribute('data-virtual-list-item-index', String(row.index))
    rowElement.setAttribute('data-virtual-list-item-key', row.key)
    Object.defineProperty(rowElement, 'getBoundingClientRect', {
      value: () => ({
        top: borderTop + row.start - element.scrollTop,
        bottom: borderTop + row.start + row.height - element.scrollTop,
        height: row.height,
        left: 0,
        right: 0,
        width: 100,
        x: 0,
        y: borderTop + row.start - element.scrollTop,
        toJSON: () => ({}),
      }),
    })
    element.append(rowElement)
  }

  return element
}

const completedApplyScroll = (version: number) =>
  Message.CompletedApplyScroll({
    version,
    outcome: ApplyScrollOutcome.Applied({
      scrollTop: 0,
      scrollHeight: 1000,
      containerHeight: 300,
      anchor: { _tag: 'None' },
    }),
  })

describe('VirtualList', () => {
  describe('exposed operations', () => {
    it('preserves the public model-first call shapes', ({
      virtualList: { operations, scrollTo, scrollToIndex },
    }) => {
      expectTypeOf<
        Parameters<typeof operations.requestScrollTo>[1]
      >().toEqualTypeOf<ScrollTarget>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollTo>[2]
      >().toEqualTypeOf<ScrollToOptions | undefined>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollToIndex>[1]
      >().toEqualTypeOf<number>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollToIndex>[2]
      >().toEqualTypeOf<ScrollToOptions | undefined>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollToKey>[1]
      >().toEqualTypeOf<string>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollToKey>[2]
      >().toEqualTypeOf<ScrollToOptions | undefined>()
      expectTypeOf<
        Parameters<typeof operations.requestScrollToOffset>[1]
      >().toEqualTypeOf<number>()
      expectTypeOf<
        Parameters<typeof operations.informOfItemsChanged>[1]
      >().toEqualTypeOf<ReadonlyArray<string>>()
      expectTypeOf<
        Parameters<typeof operations.informOfHistoryPrepended>[1]
      >().toEqualTypeOf<HistoryPrependInput<HistoryItem>>()
      expectTypeOf(scrollTo).toEqualTypeOf(operations.requestScrollTo)
      expectTypeOf(scrollToIndex).toEqualTypeOf(operations.requestScrollToIndex)
    })
  })

  describe('init', () => {
    it('starts in the Unmeasured state with scrollTop 0 and pendingScroll Idle', ({
      virtualList: { defaultInit },
    }) => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.rowHeightPx).toBe(30)
      expect(model.scrollTop).toBe(0)
      expect(model.measurement._tag).toBe('Unmeasured')
      expect(model.pendingScroll._tag).toBe('Idle')
      expect(model.pendingScrollVersion).toBe(0)
      expect(model.measuredRowHeights).toStrictEqual({})
    })

    it('keeps initialScrollTop as an offset target for compatibility', ({
      virtualList: { init },
    }) => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScrollTop: 600,
      }).model
      expect(model.scrollTop).toBe(600)
      expect(model.initialScroll._tag).toBe('Pending')
    })

    it('accepts a logical initial End target and follow-end threshold', ({
      virtualList: { init },
    }) => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
        followEnd: { thresholdPx: 8 },
      }).model

      expect(model.initialScroll._tag).toBe('Pending')
      expect(model.endBehavior).toStrictEqual({
        _tag: 'Follow',
        thresholdPx: 8,
      })
    })

    it('keeps an initial End target until rows arrive after an empty mount', ({
      virtualList: { init, update, operations },
    }) => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
      }).model
      const measured = update(
        initialModel,
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )
      const emptyScroll = update(
        measured.model,
        completedApplyScroll(measured.model.pendingScrollVersion),
      )

      expect(emptyScroll.model.initialScroll._tag).toBe('Pending')

      const arrived = operations.informOfItemsChanged(emptyScroll.model, [
        'first',
        'last',
      ])
      expect(arrived.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Target', target: { _tag: 'End' } },
      })

      const positioned = update(
        arrived.model,
        Message.CompletedApplyScroll({
          version: arrived.model.pendingScrollVersion,
          outcome: ApplyScrollOutcome.Applied({
            scrollTop: 30,
            scrollHeight: 120,
            containerHeight: 90,
            anchor: {
              _tag: 'Row',
              key: 'first',
              index: 0,
              viewportOffset: -30,
            },
          }),
        }),
      )
      expect(positioned.model.initialScroll._tag).toBe('Applied')
    })

    it('retries an initial key target after its key arrives', ({
      virtualList: { init, update, operations },
    }) => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.Key({ key: 'wanted' }) },
      }).model
      const measured = update(
        initialModel,
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )
      const missing = update(
        measured.model,
        Message.CompletedApplyScroll({
          version: measured.model.pendingScrollVersion,
          outcome: ApplyScrollOutcome.Skipped(),
        }),
      )

      expect(missing.model.initialScroll._tag).toBe('Pending')

      const arrived = operations.informOfItemsChanged(missing.model, ['wanted'])
      expect(arrived.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: {
          _tag: 'Target',
          target: { _tag: 'Key', key: 'wanted' },
        },
      })
    })

    it('lets an explicit scroll supersede a deferred initial target', ({
      virtualList: { init, scrollToEnd },
    }) => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.Key({ key: 'wanted' }) },
      }).model
      const explicitScroll = scrollToEnd(initialModel)

      expect(explicitScroll.model.initialScroll._tag).toBe('Applied')
      expect(explicitScroll.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Target', target: { _tag: 'End' } },
      })
    })

    it('lets a user scroll supersede an initial target even before a row is visible', ({
      virtualList: { init, update },
    }) => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
      }).model
      const measured = update(
        initialModel,
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )
      const scrolled = update(
        measured.model,
        Message.ObservedContainerScroll({
          scrollTop: 0,
          scrollHeight: 1000,
          containerHeight: 90,
          anchor: { _tag: 'None' },
        }),
      )

      expect(scrolled.model.initialScroll._tag).toBe('Applied')
      expect(scrolled.model.pendingScroll._tag).toBe('Idle')
      expect(scrolled.model.viewportAnchor).toStrictEqual({
        _tag: 'Offset',
        scrollTop: 0,
      })
    })
  })

  describe('ObservedContainerScroll', () => {
    it.effect('writes the new scrollTop into the model', () => {
      return Story.story(
        HistoryBlock,
        Story.init({ id: 'test', rowHeightPx: 30 }),
        Story.message(
          Message.ObservedContainerScroll({
            scrollTop: 450,
            scrollHeight: 1000,
            containerHeight: 300,
            anchor: { _tag: 'None' },
          }),
        ),
        Story.model(model => {
          expect(model.scrollTop).toBe(450)
        }),
      ).pipe(Effect.provide(layer))
    })

    it('tracks End while follow-end is within its threshold and a Row after the user scrolls away', ({
      virtualList: { init, update },
    }) => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        followEnd: { thresholdPx: 5 },
      }).model
      const atEnd = update(
        model,
        Message.ObservedContainerScroll({
          scrollTop: 700,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'last',
            index: 99,
            viewportOffset: 270,
          },
        }),
      )
      expect(atEnd.model.viewportAnchor._tag).toBe('End')

      const away = update(
        atEnd.model,
        Message.ObservedContainerScroll({
          scrollTop: 600,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'row-20',
            index: 20,
            viewportOffset: -4,
          },
        }),
      )
      expect(away.model.viewportAnchor).toStrictEqual({
        _tag: 'Row',
        key: 'row-20',
        index: 20,
        viewportOffset: -4,
      })
    })

    it('keeps an end scroll from a previous layout while rejecting its row index', ({
      virtualList: { init, update, informOfItemsChanged },
    }) => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        followEnd: { thresholdPx: 5 },
      }).model
      const observed = update(
        model,
        Message.ObservedContainerScroll({
          scrollTop: 600,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'visible',
            index: 20,
            viewportOffset: -4,
          },
        }),
      )
      const changed = informOfItemsChanged(observed.model, ['visible'])
      const atEnd = update(
        changed.model,
        Message.ObservedContainerScroll({
          scrollTop: 700,
          scrollHeight: 1000,
          containerHeight: 300,
          layoutVersion: 0,
          anchor: {
            _tag: 'Row',
            key: 'visible',
            index: 20,
            viewportOffset: -4,
          },
        }),
      )

      expect(atEnd.model.viewportAnchor._tag).toBe('End')
      expect(atEnd.model.scrollTop).toBe(700)
    })

    it.for([
      { delta: 0, isAccepted: false },
      { delta: 1, isAccepted: false },
      { delta: 60, isAccepted: true },
    ])(
      'accepts a changed native anchor from a stale layout only after scrolling by more than one pixel ($delta)',
      (
        { delta, isAccepted },
        { virtualList: { update, defaultInit, informOfItemsChanged } },
      ) => {
        const observed = update(
          defaultInit(),
          Message.ObservedContainerScroll({
            scrollTop: 100,
            scrollHeight: 1_000,
            containerHeight: 300,
            anchor: ObservedAnchor.Row({
              key: 'before',
              index: 0,
              viewportOffset: 0,
            }),
          }),
        )
        const changed = informOfItemsChanged(observed.model, [
          'before',
          'after',
        ])
        const nextAnchor = ObservedAnchor.Row({
          key: 'after',
          index: 1,
          viewportOffset: -10,
        })
        const scrolled = update(
          changed.model,
          Message.ObservedContainerScroll({
            scrollTop: 100 + delta,
            scrollHeight: 1_000,
            containerHeight: 300,
            layoutVersion: observed.model.layoutVersion,
            origin: { _tag: 'Native' },
            anchor: nextAnchor,
          }),
        )
        const expectedAnchor = isAccepted
          ? nextAnchor
          : changed.model.viewportAnchor

        expect(scrolled.model.viewportAnchor).toEqual(expectedAnchor)
        expect(scrolled.model.pendingScroll).toMatchObject({
          _tag: 'Pending',
          request: { _tag: 'Anchor', anchor: expectedAnchor },
        })
      },
    )

    it('replaces an in-flight request with the live user scroll anchor', ({
      virtualList: { scrollToEnd, defaultInit, update, operations },
    }) => {
      const requested = scrollToEnd(defaultInit())
      const scrolled = update(
        requested.model,
        Message.ObservedContainerScroll({
          scrollTop: 600,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'row-20',
            index: 20,
            viewportOffset: -4,
          },
        }),
      )

      expect(scrolled.model.pendingScroll._tag).toBe('Idle')
      expect(scrolled.model.pendingScrollVersion).toBe(2)
      const changed = operations.informOfItemsChanged(scrolled.model, [
        'row-20',
      ])
      expect(changed.model.pendingScroll._tag).toBe('Pending')
      if (changed.model.pendingScroll._tag === 'Pending') {
        expect(changed.model.pendingScroll.request).toStrictEqual({
          _tag: 'Anchor',
          baselineScrollTop: 600,
          anchor: {
            _tag: 'Row',
            key: 'row-20',
            index: 20,
            viewportOffset: -4,
          },
        })
      }
    })

    it('rebases an in-flight anchor correction to the latest visible row', ({
      virtualList: { update, defaultInit, informOfItemsChanged },
    }) => {
      const observed = update(
        defaultInit(),
        Message.ObservedContainerScroll({
          scrollTop: 40,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 0,
            viewportOffset: -40,
          },
        }),
      )
      const changed = informOfItemsChanged(observed.model, ['older', 'first'])
      const advanced = update(
        changed.model,
        Message.ObservedContainerScroll({
          scrollTop: 140,
          scrollHeight: 1100,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 1,
            viewportOffset: -20,
          },
        }),
      )

      expect(advanced.model.pendingScrollVersion).toBe(
        changed.model.pendingScrollVersion + 1,
      )
      expect(advanced.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: {
          _tag: 'Anchor',
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 1,
            viewportOffset: -20,
          },
        },
      })
      expect(advanced.commands ?? []).toHaveLength(1)

      const staleCompletion = update(
        advanced.model,
        completedApplyScroll(changed.model.pendingScrollVersion),
      )
      expect(staleCompletion.model.pendingScroll).toEqual(
        advanced.model.pendingScroll,
      )
    })

    it('uses the current offset when no row is visible during an anchor correction', ({
      virtualList: { update, defaultInit, informOfItemsChanged },
    }) => {
      const observed = update(
        defaultInit(),
        Message.ObservedContainerScroll({
          scrollTop: 40,
          scrollHeight: 1000,
          containerHeight: 300,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 0,
            viewportOffset: -40,
          },
        }),
      )
      const changed = informOfItemsChanged(observed.model, ['older', 'first'])
      const advanced = update(
        changed.model,
        Message.ObservedContainerScroll({
          scrollTop: 360,
          scrollHeight: 1100,
          containerHeight: 300,
          anchor: { _tag: 'None' },
        }),
      )

      expect(advanced.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: {
          _tag: 'Anchor',
          anchor: { _tag: 'Offset', scrollTop: 360 },
        },
      })
    })
  })

  describe('ResizedContainer', () => {
    it.effect(
      'transitions Unmeasured to Measured with the reported height',
      () => {
        return Story.story(
          HistoryBlock,
          Story.init({ id: 'test', rowHeightPx: 30 }),
          Story.message(
            Message.ResizedContainer({
              containerWidth: 320,
              containerHeight: 600,
            }),
          ),
          Story.model(model => {
            expect(model.measurement._tag).toBe('Measured')
            if (model.measurement._tag === 'Measured') {
              expect(model.measurement.containerHeight).toBe(600)
            }
          }),
        ).pipe(Effect.provide(layer))
      },
    )

    it.effect('updates the height when already Measured', () => {
      return Story.story(
        HistoryBlock,
        Story.init({ id: 'test', rowHeightPx: 30 }),
        Story.message(
          Message.ResizedContainer({
            containerWidth: 320,
            containerHeight: 600,
          }),
        ),
        Story.message(
          Message.ResizedContainer({
            containerWidth: 320,
            containerHeight: 720,
          }),
        ),
        Story.Command.resolve(ApplyScroll, completedApplyScroll(1)),
        Story.model(model => {
          if (model.measurement._tag === 'Measured') {
            expect(model.measurement.containerHeight).toBe(720)
          }
        }),
      ).pipe(Effect.provide(layer))
    })

    it.effect(
      'issues no Command on the initial Unmeasured to Measured transition when scrollTop is 0',
      () => {
        return Story.story(
          HistoryBlock,
          Story.init({ id: 'test', rowHeightPx: 30 }),
          Story.message(
            Message.ResizedContainer({
              containerWidth: 320,
              containerHeight: 600,
            }),
          ),
          Story.Command.expectNone(),
        ).pipe(Effect.provide(layer))
      },
    )

    it.effect(
      'issues an apply-scroll Command on the initial transition when scrollTop is non-zero',
      () => {
        return Story.story(
          HistoryBlock,
          Story.init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
          Story.message(
            Message.ResizedContainer({
              containerWidth: 320,
              containerHeight: 300,
            }),
          ),
          Story.Command.expectHas(ApplyScroll),
          Story.model(model => {
            expect(model.pendingScroll._tag).toBe('Pending')
            if (model.pendingScroll._tag === 'Pending') {
              expect(model.pendingScroll.request).toStrictEqual({
                _tag: 'Target',
                target: { _tag: 'Offset', offset: 600 },
                alignment: 'Start',
              })
            }
            expect(model.pendingScrollVersion).toBe(1)
          }),
          Story.Command.resolve(ApplyScroll, completedApplyScroll(1)),
        ).pipe(Effect.provide(layer))
      },
    )

    it.effect(
      'reconciles the stored viewport anchor after a later resize',
      () => {
        return Story.story(
          HistoryBlock,
          Story.init({ id: 'test', rowHeightPx: 30 }),
          Story.message(
            Message.ResizedContainer({
              containerWidth: 320,
              containerHeight: 300,
            }),
          ),
          Story.message(
            Message.ResizedContainer({
              containerWidth: 320,
              containerHeight: 320,
            }),
          ),
          Story.Command.expectHas(ApplyScroll),
          Story.Command.resolve(ApplyScroll, completedApplyScroll(1)),
        ).pipe(Effect.provide(layer))
      },
    )

    it('invalidates cached row measurements when the container width changes', ({
      virtualList: { update, defaultInit },
    }) => {
      const measured = update(
        defaultInit(),
        Message.ResizedContainer({
          containerWidth: 320,
          containerHeight: 300,
        }),
      )
      const withRowMeasurement = update(
        measured.model,
        Message.MeasuredRows({
          measurements: [{ key: 'row-1', height: 72, layoutVersion: 0 }],
        }),
      )
      const resized = update(
        withRowMeasurement.model,
        Message.ResizedContainer({
          containerWidth: 480,
          containerHeight: 300,
        }),
      )

      expect(resized.model.measuredRowHeights).toStrictEqual({})
      expect(resized.model.layoutVersion).toBe(1)
      expect(resized.commands ?? []).toHaveLength(1)
    })
  })

  describe('CompletedApplyScroll', () => {
    it('clears pendingScroll when the version matches', ({
      virtualList: { defaultInit, scrollToIndex, update },
    }) => {
      const baseModel = defaultInit()
      const indexScroll = scrollToIndex(baseModel, 50)
      expect(indexScroll.model.pendingScroll._tag).toBe('Pending')

      const completion = update(
        indexScroll.model,
        completedApplyScroll(indexScroll.model.pendingScrollVersion),
      )
      expect(completion.model.pendingScroll._tag).toBe('Idle')
    })

    it('ignores a stale completion when a newer scroll is in flight', ({
      virtualList: { scrollToIndex, defaultInit, update },
    }) => {
      const firstScroll = scrollToIndex(defaultInit(), 10)
      const secondScroll = scrollToIndex(firstScroll.model, 20)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)

      const staleCompletion = update(
        secondScroll.model,
        completedApplyScroll(1),
      )
      expect(staleCompletion.model.pendingScroll._tag).toBe('Pending')
      if (staleCompletion.model.pendingScroll._tag === 'Pending') {
        expect(staleCompletion.model.pendingScroll.version).toBe(2)
      }
    })
  })

  describe('scrollToIndex', () => {
    it('bumps the version and stores the target index in pendingScroll', ({
      virtualList: { scrollToIndex, defaultInit },
    }) => {
      const indexScroll = scrollToIndex(defaultInit(), 42)
      expect(indexScroll.model.pendingScrollVersion).toBe(1)
      expect(indexScroll.model.pendingScroll._tag).toBe('Pending')
      if (indexScroll.model.pendingScroll._tag === 'Pending') {
        expect(indexScroll.model.pendingScroll.request).toStrictEqual({
          _tag: 'Target',
          target: { _tag: 'Index', index: 42 },
          alignment: 'Start',
        })
        expect(indexScroll.model.pendingScroll.version).toBe(1)
      }
      expect(indexScroll.commands ?? []).toHaveLength(1)
    })

    it('increments the version monotonically across calls', ({
      virtualList: { scrollToIndex, defaultInit },
    }) => {
      const firstScroll = scrollToIndex(defaultInit(), 10)
      const secondScroll = scrollToIndex(firstScroll.model, 20)
      const thirdScroll = scrollToIndex(secondScroll.model, 30)
      expect(firstScroll.model.pendingScrollVersion).toBe(1)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)
      expect(thirdScroll.model.pendingScrollVersion).toBe(3)
    })

    it('skips a stale request after a newer view has committed', async ({
      virtualList: { scrollToIndex, defaultInit, executeScroll },
    }) => {
      const firstScroll = scrollToIndex(defaultInit(), 5)
      const secondScroll = scrollToIndex(firstScroll.model, 6)
      const scrollTop = await executeScroll(
        firstScroll,
        30,
        90,
        [{ index: 5, key: 'row-5', start: 150, height: 30 }],
        1000,
        secondScroll.model.pendingScrollVersion,
      )

      expect(scrollTop).toBe(30)
    })

    const alignmentCases: ReadonlyArray<
      Readonly<{
        alignment: ScrollAlignment
        currentScrollTop: number
        expectedScrollTop: number
      }>
    > = [
      { alignment: 'Start', currentScrollTop: 0, expectedScrollTop: 150 },
      { alignment: 'Center', currentScrollTop: 0, expectedScrollTop: 120 },
      { alignment: 'End', currentScrollTop: 0, expectedScrollTop: 90 },
      { alignment: 'Nearest', currentScrollTop: 100, expectedScrollTop: 100 },
    ]

    it.for(alignmentCases)(
      'aligns the row to $alignment',
      async (
        { alignment, currentScrollTop, expectedScrollTop },
        { virtualList: { scrollToIndex, defaultInit, executeScroll } },
      ) => {
        const indexScroll = scrollToIndex(defaultInit(), 5, { alignment })
        const scrollTop = await executeScroll(
          indexScroll,
          currentScrollTop,
          90,
          [{ index: 5, key: 'row-5', start: 150, height: 30 }],
        )

        expect(scrollTop).toBe(expectedScrollTop)
      },
    )

    it('uses the nearest edge when the row is outside the viewport', async ({
      virtualList: { executeScroll, scrollToIndex, defaultInit },
    }) => {
      const belowViewport = await executeScroll(
        scrollToIndex(defaultInit(), 5, { alignment: 'Nearest' }),
        0,
        90,
        [{ index: 5, key: 'row-5', start: 150, height: 30 }],
      )
      const aboveViewport = await executeScroll(
        scrollToIndex(defaultInit(), 5, { alignment: 'Nearest' }),
        160,
        90,
        [{ index: 5, key: 'row-5', start: 150, height: 30 }],
      )

      expect(belowViewport).toBe(90)
      expect(aboveViewport).toBe(150)
    })

    it('clamps aligned scroll positions at the start of the list', async ({
      virtualList: { scrollToIndex, defaultInit, executeScroll },
    }) => {
      const indexScroll = scrollToIndex(defaultInit(), 0, {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(indexScroll, 300, 90, [
        { index: 0, key: 'row-0', start: 0, height: 30 },
      ])

      expect(scrollTop).toBe(0)
    })

    it('aligns a row to the scrollport inside a bordered container', async ({
      virtualList: { scrollToIndex, defaultInit, runMountedScroll },
    }) => {
      const indexScroll = scrollToIndex(defaultInit(), 5)
      const element = createScrollElement(
        0,
        90,
        [{ index: 5, key: 'row-5', start: 150, height: 30 }],
        1000,
        indexScroll.model.pendingScrollVersion,
        8,
      )
      document.body.append(element)

      try {
        expect(await runMountedScroll(indexScroll, element)).toBe(150)
      } finally {
        element.remove()
      }
    })

    it('aligns a variable-height row from its rendered offset', async ({
      virtualList: { scrollToIndex, defaultInit, executeScroll },
    }) => {
      const indexScroll = scrollToIndex(defaultInit(), 2, {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(indexScroll, 0, 50, [
        { index: 2, key: 'row-2', start: 30, height: 30 },
      ])

      expect(scrollTop).toBe(20)
    })

    it('targets its own row when a row contains another VirtualList', async ({
      virtualList: { scrollToIndex, defaultInit, runMountedScroll },
    }) => {
      const indexScroll = scrollToIndex(defaultInit(), 1)
      const element = createScrollElement(
        0,
        90,
        [
          { index: 0, key: 'outer-0', start: 0, height: 100 },
          { index: 1, key: 'outer-1', start: 200, height: 30 },
        ],
        500,
        indexScroll.model.pendingScrollVersion,
      )
      const outerRow = element.firstElementChild
      if (!(outerRow instanceof HTMLElement)) {
        throw new Error('Expected an outer row')
      }

      const innerList = document.createElement('ul')
      const innerRow = document.createElement('li')
      innerRow.setAttribute('data-virtual-list-item-index', '1')
      innerRow.setAttribute('data-virtual-list-item-key', 'inner-1')
      Object.defineProperty(innerRow, 'getBoundingClientRect', {
        value: () => ({ top: 50, bottom: 80, height: 30 }),
      })
      innerList.append(innerRow)
      outerRow.append(innerList)
      document.body.append(element)

      try {
        expect(await runMountedScroll(indexScroll, element)).toBe(200)
      } finally {
        element.remove()
      }
    })
  })

  describe('scrollToKey', () => {
    it('scrolls to the row whose key matches', async ({
      virtualList: { scrollToKey, defaultInit, executeScroll },
    }) => {
      const keyScroll = scrollToKey(defaultInit(), 'second')
      const scrollTop = await executeScroll(keyScroll, 0, 30, [
        { index: 1, key: 'second', start: 30, height: 20 },
      ])

      expect(keyScroll.model.pendingScroll._tag).toBe('Pending')
      if (keyScroll.model.pendingScroll._tag === 'Pending') {
        expect(keyScroll.model.pendingScroll.request).toStrictEqual({
          _tag: 'Target',
          target: { _tag: 'Key', key: 'second' },
          alignment: 'Start',
        })
      }
      expect(scrollTop).toBe(30)
    })

    it('aligns from the live rendered row height', async ({
      virtualList: { scrollToKey, defaultInit, executeScroll },
    }) => {
      const keyScroll = scrollToKey(defaultInit(), 'third', {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(keyScroll, 0, 50, [
        { index: 2, key: 'third', start: 30, height: 30 },
      ])

      expect(scrollTop).toBe(20)
    })

    it('leaves scrollTop unchanged when the rendered key is absent', async ({
      virtualList: { scrollToKey, defaultInit, executeScroll },
    }) => {
      const keyScroll = scrollToKey(defaultInit(), 'missing')
      const scrollTop = await executeScroll(keyScroll, 40, 50)

      expect(scrollTop).toBe(40)
    })
  })

  describe('scrollToOffset', () => {
    it('scrolls to the requested pixel offset', async ({
      virtualList: { scrollToOffset, defaultInit, executeScroll },
    }) => {
      const offsetScroll = scrollToOffset(defaultInit(), 275)
      const scrollTop = await executeScroll(offsetScroll, 0, 90, [], 500)

      expect(offsetScroll.model.pendingScroll._tag).toBe('Pending')
      if (offsetScroll.model.pendingScroll._tag === 'Pending') {
        expect(offsetScroll.model.pendingScroll.request).toStrictEqual({
          _tag: 'Target',
          target: { _tag: 'Offset', offset: 275 },
          alignment: 'Start',
        })
      }
      expect(scrollTop).toBe(275)
    })

    it('scrolls a mounted container inside a shadow root', async ({
      virtualList: { scrollToOffset, defaultInit, runMountedScroll },
    }) => {
      const host = document.createElement('div')
      const shadowRoot = host.attachShadow({ mode: 'open' })
      const offsetScroll = scrollToOffset(defaultInit(), 275)
      const element = createScrollElement(
        0,
        90,
        [],
        500,
        offsetScroll.model.pendingScrollVersion,
      )
      shadowRoot.append(element)
      document.body.append(host)

      try {
        expect(document.getElementById('test')).toBeNull()
        expect(shadowRoot.getElementById('test')).toBe(element)

        const scrollTop = await runMountedScroll(offsetScroll, element)

        expect(scrollTop).toBe(275)
      } finally {
        host.remove()
      }
    })

    it('does not route a scroll to another shadow root with the same id', async ({
      virtualList: { scrollToOffset, defaultInit },
    }) => {
      const offsetScroll = scrollToOffset(defaultInit(), 275)
      const firstHost = document.createElement('div')
      const secondHost = document.createElement('div')
      const firstElement = createScrollElement(
        0,
        90,
        [],
        500,
        offsetScroll.model.pendingScrollVersion,
      )
      const secondElement = createScrollElement(
        0,
        90,
        [],
        500,
        offsetScroll.model.pendingScrollVersion,
      )
      firstHost.attachShadow({ mode: 'open' }).append(firstElement)
      secondHost.attachShadow({ mode: 'open' }).append(secondElement)
      document.body.append(firstHost, secondHost)

      try {
        const outcome = await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const firstMounted = yield* Deferred.make<void>()
              const secondMounted = yield* Deferred.make<void>()
              yield* ObserveVirtualList({ id: offsetScroll.model.id })
                .f(firstElement, Mount.liveViewStateChanges)
                .pipe(
                  Stream.runForEach(() =>
                    Deferred.succeed(firstMounted, undefined),
                  ),
                  Effect.forkScoped,
                )
              yield* ObserveVirtualList({ id: offsetScroll.model.id })
                .f(secondElement, Mount.liveViewStateChanges)
                .pipe(
                  Stream.runForEach(() =>
                    Deferred.succeed(secondMounted, undefined),
                  ),
                  Effect.forkScoped,
                )
              yield* Deferred.await(firstMounted)
              yield* Deferred.await(secondMounted)

              const maybeCommand = pipe(offsetScroll.commands ?? [], Array.head)
              if (Option.isNone(maybeCommand)) {
                throw new Error('Expected one scroll Command')
              }

              const maybeArgs = Story.Command.argsOf(ApplyScroll)(
                maybeCommand.value,
              )
              if (Option.isNone(maybeArgs)) {
                throw new Error('Expected the original ApplyScroll Command')
              }

              return yield* ApplyScroll(maybeArgs.value).effect
            }),
          ).pipe(Effect.provide(EffectsLayer)),
        )

        if (outcome._tag !== 'CompletedApplyScroll') {
          throw new Error('Expected a scroll Command result')
        }
        expect(outcome.outcome._tag).toBe('Skipped')
        expect(firstElement.scrollTop).toBe(0)
        expect(secondElement.scrollTop).toBe(0)
      } finally {
        firstHost.remove()
        secondHost.remove()
      }
    })

    it('does not scroll a container while its Mount is paused', async ({
      virtualList: { scrollToOffset, defaultInit },
    }) => {
      const offsetScroll = scrollToOffset(defaultInit(), 275)
      const element = createScrollElement(
        0,
        90,
        [],
        500,
        offsetScroll.model.pendingScrollVersion,
      )
      document.body.append(element)

      try {
        const outcome = await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const started = yield* Deferred.make<void>()
              yield* ObserveVirtualList({ id: offsetScroll.model.id })
                .f(element, Stream.make('Paused'))
                .pipe(
                  Stream.onStart(Deferred.succeed(started, undefined)),
                  Stream.runDrain,
                  Effect.forkScoped,
                )
              yield* Deferred.await(started)
              yield* Effect.yieldNow

              const maybeCommand = pipe(offsetScroll.commands ?? [], Array.head)
              if (Option.isNone(maybeCommand)) {
                throw new Error('Expected one scroll Command')
              }

              const maybeArgs = Story.Command.argsOf(ApplyScroll)(
                maybeCommand.value,
              )
              if (Option.isNone(maybeArgs)) {
                throw new Error('Expected the original ApplyScroll Command')
              }

              return yield* ApplyScroll(maybeArgs.value).effect
            }),
          ).pipe(Effect.provide(EffectsLayer)),
        )

        if (outcome._tag !== 'CompletedApplyScroll') {
          throw new Error('Expected a scroll Command result')
        }
        expect(outcome.outcome._tag).toBe('Skipped')
        expect(element.scrollTop).toBe(0)
      } finally {
        element.remove()
      }
    })

    it('clamps a negative pixel offset to zero', async ({
      virtualList: { scrollToOffset, defaultInit, executeScroll },
    }) => {
      const offsetScroll = scrollToOffset(defaultInit(), -10)
      const scrollTop = await executeScroll(offsetScroll, 200, 90, [], 500)

      expect(scrollTop).toBe(0)
    })

    it('clamps a pixel offset to the live maximum', async ({
      virtualList: { executeScroll, scrollToOffset, defaultInit },
    }) => {
      const scrollTop = await executeScroll(
        scrollToOffset(defaultInit(), 900),
        0,
        90,
        [],
        500,
      )

      expect(scrollTop).toBe(410)
    })
  })

  describe('scrollToEnd', () => {
    it('uses the live scrollHeight and container height', async ({
      virtualList: { executeScroll, scrollToEnd, defaultInit },
    }) => {
      const scrollTop = await executeScroll(
        scrollToEnd(defaultInit()),
        0,
        90,
        [],
        500,
      )

      expect(scrollTop).toBe(410)
    })
  })

  describe('informOfItemsChanged', () => {
    it('bumps the layout version and reconciles the stored anchor', ({
      virtualList: { operations, defaultInit },
    }) => {
      const itemChange = operations.informOfItemsChanged(defaultInit(), [
        'first',
        'second',
      ])

      expect(itemChange.model.layoutVersion).toBe(1)
      expect(itemChange.model.pendingScroll._tag).toBe('Pending')
      if (itemChange.model.pendingScroll._tag === 'Pending') {
        expect(itemChange.model.pendingScroll.request._tag).toBe('Anchor')
      }
      expect(itemChange.commands ?? []).toHaveLength(1)
    })

    it('does not write scrollTop when the visible row already has its anchored position', async ({
      virtualList: {
        update,
        defaultInit,
        informOfItemsChanged,
        runMountedScroll,
      },
    }) => {
      const observed = update(
        defaultInit(),
        Message.ObservedContainerScroll({
          scrollTop: 40,
          scrollHeight: 1000,
          containerHeight: 100,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 0,
            viewportOffset: -40,
          },
        }),
      )
      const itemChange = informOfItemsChanged(observed.model, ['first'])
      const element = createScrollElement(
        40,
        100,
        [{ index: 0, key: 'first', start: 0, height: 80 }],
        1000,
        itemChange.model.pendingScrollVersion,
      )
      let scrollTop = element.scrollTop
      let scrollWrites = 0
      Object.defineProperty(element, 'scrollTop', {
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value
          scrollWrites += 1
        },
      })
      document.body.append(element)

      try {
        expect(await runMountedScroll(itemChange, element)).toBe(40)
        expect(scrollWrites).toBe(0)
      } finally {
        element.remove()
      }
    })

    it('restores the keyed row when native anchoring does not preserve its position', async ({
      virtualList: {
        update,
        defaultInit,
        informOfItemsChanged,
        runMountedScroll,
      },
    }) => {
      const observed = update(
        defaultInit(),
        Message.ObservedContainerScroll({
          scrollTop: 40,
          scrollHeight: 1000,
          containerHeight: 100,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 0,
            viewportOffset: -40,
          },
        }),
      )
      const itemChange = informOfItemsChanged(observed.model, ['first'])
      const element = createScrollElement(
        40,
        100,
        [{ index: 0, key: 'first', start: 120, height: 80 }],
        1000,
        itemChange.model.pendingScrollVersion,
      )
      let scrollTop = element.scrollTop
      let scrollWrites = 0
      Object.defineProperty(element, 'scrollTop', {
        get: () => scrollTop,
        set: (value: number) => {
          scrollTop = value
          scrollWrites += 1
        },
      })
      document.body.append(element)
      const scrollTo = vi.spyOn(element, 'scrollTo')

      try {
        expect(await runMountedScroll(itemChange, element)).toBe(160)
        expect(scrollTo).toHaveBeenCalledWith({ top: 160 })
        expect(scrollWrites).toBe(1)
      } finally {
        element.remove()
      }
    })

    it('does not undo a user scroll that overtakes a pending anchor correction', async ({
      virtualList: {
        update,
        defaultInit,
        informOfItemsChanged,
        runMountedScroll,
      },
    }) => {
      const observed = update(
        defaultInit(),
        Message.ObservedContainerScroll({
          scrollTop: 40,
          scrollHeight: 1000,
          containerHeight: 100,
          anchor: {
            _tag: 'Row',
            key: 'first',
            index: 0,
            viewportOffset: -40,
          },
        }),
      )
      const itemChange = informOfItemsChanged(observed.model, ['first'])
      const element = createScrollElement(
        180,
        100,
        [{ index: 0, key: 'first', start: 120, height: 80 }],
        1000,
        itemChange.model.pendingScrollVersion,
      )
      const scrollTo = vi.spyOn(element, 'scrollTo')
      document.body.append(element)

      try {
        expect(await runMountedScroll(itemChange, element)).toBe(180)
        expect(scrollTo).not.toHaveBeenCalled()
      } finally {
        element.remove()
      }
    })
  })

  describe('informOfHistoryPrepended', () => {
    it('extends history without consuming the loading buffer or issuing a scroll', ({
      virtualList: { activeHistoryModel, prependHistory },
    }) => {
      const model = activeHistoryModel()
      const prepend = prependHistory(
        model,
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 80 }],
      )

      expect(prepend.model.startPaddingPx).toBe(1000)
      expect(prepend.model.pendingScroll._tag).toBe('Idle')
      expect(prepend.commands).toBeUndefined()
    })

    it('records a measured prepended row without changing the loading buffer', ({
      virtualList: { activeHistoryModel, prependHistory, update },
    }) => {
      const model = activeHistoryModel()
      const prepend = prependHistory(
        model,
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 80 }],
      )
      const measurement = update(
        prepend.model,
        Message.MeasuredRows({
          measurements: [
            {
              key: 'older',
              height: 100,
              layoutHeightPx: 80,
              index: 0,
              layoutVersion: prepend.model.layoutVersion,
            },
          ],
        }),
      )

      expect(measurement.model.startPaddingPx).toBe(1000)
      expect(measurement.model.measuredRowHeights).toStrictEqual({ older: 100 })
      expect(measurement.commands).toBeUndefined()
    })

    it('removes the loading buffer when the final page arrives', ({
      virtualList: { prependHistory, historyInit },
    }) => {
      const prepend = prependHistory(
        historyInit(),
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 80 }],
        HistoryPage.Complete(),
      )

      expect(prepend.model.startPaddingPx).toBe(0)
      expect(prepend.model.history).toMatchObject({
        _tag: 'Enabled',
        page: { _tag: 'Complete' },
      })
      expect(prepend.commands).toBeUndefined()
    })

    it('finishes history without a scroll even when the final page is tall', ({
      virtualList: { activeHistoryModel, prependHistory },
    }) => {
      const model = activeHistoryModel(70)
      const prepend = prependHistory(
        model,
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 80 }],
        HistoryPage.Complete(),
      )

      expect(prepend.model.startPaddingPx).toBe(0)
      expect(prepend.model.history).toMatchObject({
        _tag: 'Enabled',
        page: { _tag: 'Complete' },
      })
      expect(prepend.commands).toBeUndefined()
    })
  })

  describe('EndedContainerScroll', () => {
    it('leaves an ordinary list unchanged for history events', ({
      virtualList: { defaultInit, update },
    }) => {
      const model = defaultInit()
      const approached = update(
        model,
        Message.ApproachedLoadedStart({
          distanceToLoadedStartPx: 100,
          containerHeight: 300,
        }),
      )
      const settled = update(model, Message.EndedContainerScroll())

      expect(approached.model).toBe(model)
      expect(settled.model).toBe(model)
      expect(settled.commands).toBeUndefined()
    })

    it('ends history scrolling without moving the viewport', ({
      virtualList: { activeHistoryModel, prependHistory, update },
    }) => {
      const model = activeHistoryModel()
      const prepend = prependHistory(
        model,
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 100 }],
      )
      const replenished = update(prepend.model, Message.EndedContainerScroll())

      expect(replenished.model.startPaddingPx).toBe(1000)
      expect(replenished.model.pendingScroll._tag).toBe('Idle')
      expect(replenished.commands).toBeUndefined()

      const unchanged = update(
        replenished.model,
        Message.EndedContainerScroll(),
      )
      expect(unchanged.model.startPaddingPx).toBe(1000)
      expect(unchanged.commands).toBeUndefined()
    })
  })

  describe('ObservedContainerScroll with history', () => {
    it('uses negative Self offsets for row anchoring and follow-end distance', ({
      virtualList: { init, update },
    }) => {
      const anchor = ObservedAnchor.Row({
        key: 'visible',
        index: 10,
        viewportOffset: -5,
      })
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        history: { reservePx: 1_000, prefetchViewports: 4 },
        followEnd: { thresholdPx: 8 },
      }).model
      const away = update(
        model,
        Message.ObservedContainerScroll({
          scrollTop: -160,
          scrollHeight: 2_000,
          containerHeight: 100,
          anchor,
        }),
      )
      const nearEnd = update(
        away.model,
        Message.ObservedContainerScroll({
          scrollTop: -4,
          scrollHeight: 2_000,
          containerHeight: 100,
          anchor,
        }),
      )

      expect(away.model.viewportAnchor).toEqual(anchor)
      expect(nearEnd.model.viewportAnchor).toEqual({ _tag: 'End' })
    })

    it('keeps a stable loading buffer throughout repeated page loads', ({
      virtualList: { update, activeHistoryModel, prependHistory },
    }) => {
      const scrolled = update(
        activeHistoryModel(),
        Message.ObservedContainerScroll({
          scrollTop: 900,
          scrollHeight: 1300,
          containerHeight: 100,
          anchor: { _tag: 'None' },
        }),
      )
      const prepend = prependHistory(
        scrolled.model,
        ['older', 'first'],
        [{ key: 'older', estimatedHeightPx: 300 }],
      )
      const continuedScroll = update(
        prepend.model,
        Message.ObservedContainerScroll({
          scrollTop: 800,
          scrollHeight: 1300,
          containerHeight: 100,
          anchor: { _tag: 'None' },
        }),
      )

      expect(continuedScroll.model.startPaddingPx).toBe(1000)
      expect(continuedScroll.commands).toBeUndefined()

      const replenished = update(
        continuedScroll.model,
        Message.EndedContainerScroll(),
      )
      expect(replenished.model.startPaddingPx).toBe(1000)
      expect(replenished.model.pendingScroll._tag).toBe('Idle')
      expect(replenished.commands).toBeUndefined()
    })
  })

  describe('ObserveVirtualList', () => {
    it('reports a changed width before scroll observation without repeating the measurement', async () => {
      const element = createScrollElement(0, 100, [], 1_000, 0)
      Object.defineProperty(element, 'clientWidth', {
        value: 400,
        configurable: true,
      })
      document.body.append(element)

      try {
        const messages = await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const mounted = yield* Deferred.make<void>()
              const observed = yield* Queue.unbounded<void>()
              const messages = yield* Ref.make<ReadonlyArray<Message>>([])
              yield* ObserveVirtualList({ id: 'test' })
                .f(element, Mount.liveViewStateChanges)
                .pipe(
                  Stream.runForEach(message =>
                    Effect.gen(function* () {
                      yield* Ref.update(messages, Array.append(message))

                      if (message._tag === 'ResizedContainer') {
                        yield* Deferred.succeed(mounted, undefined)
                      } else if (message._tag === 'ObservedContainerScroll') {
                        yield* Queue.offer(observed, undefined)
                      }
                    }),
                  ),
                  Effect.forkScoped,
                )
              yield* Deferred.await(mounted)

              Object.defineProperty(element, 'clientWidth', { value: 800 })
              element.dispatchEvent(new Event('scroll'))
              yield* Queue.take(observed)

              element.dispatchEvent(new Event('scroll'))
              yield* Queue.take(observed)

              return yield* Ref.get(messages)
            }),
          ).pipe(Effect.timeout('2 seconds'), Effect.provide(EffectsLayer)),
        )
        const afterWidthChange = Array.filter(
          messages,
          message =>
            message._tag === 'ObservedContainerScroll' ||
            (message._tag === 'ResizedContainer' &&
              message.containerWidth === 800),
        )

        expect(Array.map(afterWidthChange, message => message._tag)).toEqual([
          'ResizedContainer',
          'ObservedContainerScroll',
          'ObservedContainerScroll',
        ])
      } finally {
        element.remove()
      }
    })

    it.for([
      { scrollTop: 40, measuredHeight: 60, key: '120' },
      { scrollTop: 40, measuredHeight: 20, key: '120' },
      { scrollTop: 80, measuredHeight: 60, key: '121' },
    ])(
      'anchors absolute rows using committed bounds at $scrollTop with measured height $measuredHeight',
      async ({ scrollTop, measuredHeight, key }) => {
        const element = createScrollElement(
          scrollTop,
          90,
          [
            { index: 119, key: '119', start: 0, height: measuredHeight },
            { index: 120, key: '120', start: 40, height: measuredHeight },
            { index: 121, key: '121', start: 80, height: measuredHeight },
          ],
          1_000,
          0,
        )
        element.setAttribute('data-virtual-list-absolute', 'true')
        for (const row of element.children) {
          row.setAttribute('data-virtual-list-layout-height', '40')
        }
        document.body.append(element)

        try {
          const anchor = await Effect.runPromise(
            Effect.scoped(
              Effect.gen(function* () {
                const mounted = yield* Deferred.make<void>()
                const observed =
                  yield* Deferred.make<
                    typeof Message.ObservedContainerScroll.Type
                  >()
                yield* ObserveVirtualList({ id: 'test' })
                  .f(element, Mount.liveViewStateChanges)
                  .pipe(
                    Stream.runForEach(message =>
                      message._tag === 'ObservedContainerScroll'
                        ? Deferred.succeed(observed, message)
                        : Deferred.succeed(mounted, undefined),
                    ),
                    Effect.forkScoped,
                  )
                yield* Deferred.await(mounted)
                element.dispatchEvent(new Event('scroll'))
                const snapshot = yield* Deferred.await(observed)
                return snapshot.anchor
              }),
            ).pipe(Effect.timeout('2 seconds'), Effect.provide(EffectsLayer)),
          )

          expect(anchor).toEqual({
            _tag: 'Row',
            key,
            index: globalThis.Number(key),
            viewportOffset: 0,
          })
        } finally {
          element.remove()
        }
      },
    )

    it('reports scroll settling when native scrollend is not delivered', async () => {
      const element = document.createElement('div')
      element.id = 'test'
      Object.defineProperty(element, 'onscrollend', { value: null })
      document.body.append(element)

      try {
        const ended = await Effect.runPromise(
          Effect.scoped(
            Effect.gen(function* () {
              const mounted = yield* Deferred.make<void>()
              const settled = yield* Deferred.make<void>()
              yield* ObserveVirtualList({
                id: 'test',
                observeHistory: true,
              })
                .f(element, Mount.liveViewStateChanges)
                .pipe(
                  Stream.runForEach(message =>
                    message._tag === 'EndedContainerScroll'
                      ? Deferred.succeed(settled, undefined)
                      : Deferred.succeed(mounted, undefined),
                  ),
                  Effect.forkScoped,
                )
              yield* Deferred.await(mounted)
              element.dispatchEvent(new Event('scroll'))
              yield* Deferred.await(settled)
              return true
            }),
          ).pipe(Effect.timeout('2 seconds'), Effect.provide(EffectsLayer)),
        )

        expect(ended).toBe(true)
      } finally {
        element.remove()
      }
    })
  })

  describe('external layout observation', () => {
    const externalContainers = [
      ScrollContainer.Window(),
      ScrollContainer.Ancestor({ selector: '#main' }),
    ]

    it.for(externalContainers)(
      'preserves the offset above a $_tag list when visible rows are reordered or removed',
      (
        scrollContainer,
        { virtualList: { update, init, informOfItemsChanged } },
      ) => {
        const observed = update(
          init({ id: 'test', rowHeightPx: 30, scrollContainer }).model,
          Message.ObservedContainerScroll({
            scrollTop: -180,
            scrollHeight: 1_000,
            containerHeight: 300,
            anchor: ObservedAnchor.Row({
              key: 'first',
              index: 0,
              viewportOffset: 180,
            }),
          }),
        )
        const reordered = informOfItemsChanged(observed.model, [
          'second',
          'first',
        ])
        const filtered = informOfItemsChanged(reordered.model, ['second'])

        expect(observed.model.viewportAnchor).toEqual({
          _tag: 'Offset',
          scrollTop: -180,
        })
        expect(filtered.model.pendingScroll).toMatchObject({
          _tag: 'Pending',
          request: {
            _tag: 'Anchor',
            anchor: { _tag: 'Offset', scrollTop: -180 },
          },
        })
      },
    )

    it.for(externalContainers)(
      'preserves the offset above an underfilled $_tag list with follow-end enabled',
      (scrollContainer, { virtualList: { update, init } }) => {
        const observed = update(
          init({
            id: 'test',
            rowHeightPx: 30,
            scrollContainer,
            followEnd: { thresholdPx: 8 },
          }).model,
          Message.ObservedContainerScroll({
            scrollTop: -180,
            scrollHeight: 100,
            containerHeight: 300,
            anchor: ObservedAnchor.Row({
              key: 'first',
              index: 0,
              viewportOffset: 180,
            }),
          }),
        )

        expect(observed.model.viewportAnchor).toEqual({
          _tag: 'Offset',
          scrollTop: -180,
        })
      },
    )

    it.for(externalContainers)(
      'preserves a $_tag row anchor after scrolling into the list',
      (
        scrollContainer,
        { virtualList: { update, init, informOfItemsChanged } },
      ) => {
        const anchor = ObservedAnchor.Row({
          key: 'second',
          index: 1,
          viewportOffset: -10,
        })
        const observed = update(
          init({ id: 'test', rowHeightPx: 30, scrollContainer }).model,
          Message.ObservedContainerScroll({
            scrollTop: 40,
            scrollHeight: 1_000,
            containerHeight: 300,
            anchor,
          }),
        )
        const reordered = informOfItemsChanged(observed.model, [
          'second',
          'first',
        ])

        expect(reordered.model.pendingScroll).toMatchObject({
          _tag: 'Pending',
          request: { _tag: 'Anchor', anchor },
        })
      },
    )

    it('captures the current row after preceding content moves an idle list', ({
      virtualList: { update, init, informOfItemsChanged },
    }) => {
      const initial = update(
        init({
          id: 'test',
          rowHeightPx: 30,
          scrollContainer: ScrollContainer.Window(),
        }).model,
        Message.ObservedContainerScroll({
          scrollTop: 120,
          scrollHeight: 1_000,
          containerHeight: 100,
          anchor: ObservedAnchor.Row({
            key: 'fourth',
            index: 4,
            viewportOffset: 0,
          }),
        }),
      )
      const currentAnchor = ObservedAnchor.Row({
        key: 'second',
        index: 2,
        viewportOffset: -10,
      })
      const shifted = update(
        initial.model,
        Message.ObservedContainerScroll({
          scrollTop: 70,
          scrollHeight: 1_000,
          containerHeight: 100,
          anchor: currentAnchor,
          origin: { _tag: 'Layout' },
        }),
      )
      const changed = informOfItemsChanged(shifted.model, ['second', 'fourth'])

      expect(shifted.model.viewportAnchor).toEqual(currentAnchor)
      expect(changed.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Anchor', anchor: currentAnchor },
      })
    })
  })

  describe('programmatic target measurement', () => {
    const snapshot = {
      scrollTop: 900,
      scrollHeight: 1_000,
      containerHeight: 100,
      anchor: ObservedAnchor.Row({
        key: 'last-window-start',
        index: 29,
        viewportOffset: 0,
      }),
    }

    it('keeps End as the target while measured heights change its estimated extent', ({
      virtualList: { completedEnd, update },
    }) => {
      const model = completedEnd()
      const measured = update(
        model,
        Message.MeasuredRows({
          measurements: [
            {
              key: 'last',
              index: 32,
              height: 60,
              layoutHeightPx: 30,
              layoutVersion: model.layoutVersion,
            },
          ],
        }),
      )

      expect(measured.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Target', target: { _tag: 'End' } },
      })
    })

    it('does not let a previous Command scroll cancel a newer target', ({
      virtualList: { scrollToEnd, defaultInit, scrollToIndex, update },
    }) => {
      const requested = scrollToEnd(defaultInit())
      const newer = scrollToIndex(requested.model, 12)
      const observed = update(
        newer.model,
        Message.ObservedContainerScroll({
          ...snapshot,
          origin: {
            _tag: 'Applied',
            version: requested.model.pendingScrollVersion,
          },
        }),
      )

      expect(observed.model.pendingScroll).toEqual(newer.model.pendingScroll)
      expect(observed.model.pendingScrollVersion).toBe(
        newer.model.pendingScrollVersion,
      )
      expect(observed.model.maybeMeasurementTarget).toEqual(
        newer.model.maybeMeasurementTarget,
      )
    })

    it('releases the retained target when native scrolling takes over', ({
      virtualList: { completedEnd, update },
    }) => {
      const model = completedEnd()
      const observed = update(
        model,
        Message.ObservedContainerScroll({ ...snapshot, scrollTop: 800 }),
      )

      expect(Option.isNone(observed.model.maybeMeasurementTarget)).toBe(true)
      expect(observed.model.viewportAnchor).toMatchObject({ _tag: 'Row' })
    })

    it('does not turn an End request into followEnd for subsequent item changes', ({
      virtualList: { informOfItemsChanged, completedEnd },
    }) => {
      const changed = informOfItemsChanged(completedEnd(), [
        'last-window-start',
        'last',
        'appended',
      ])

      expect(Option.isNone(changed.model.maybeMeasurementTarget)).toBe(true)
      expect(changed.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Anchor', anchor: { _tag: 'Row' } },
      })
    })
  })

  describe('MeasuredRows', () => {
    it('leaves the Model unchanged when a row matches its layout height', ({
      virtualList: { defaultInit, update },
    }) => {
      const initialModel = defaultInit()
      Story.story(
        update,
        Story.given(initialModel),
        Story.message(
          Message.MeasuredRows({
            measurements: [
              {
                key: 'row-1',
                height: 30,
                layoutHeightPx: 30,
                layoutVersion: initialModel.layoutVersion,
              },
            ],
          }),
        ),
        Story.model(model => {
          expect(model).toBe(initialModel)
        }),
        Story.Command.expectNone(),
      )
    })

    it('records a height correction above the visible row without scrolling', ({
      virtualList: { historyInit, update, prependHistory },
    }) => {
      const model = historyInit()
      const observed = update(
        model,
        Message.ObservedContainerScroll({
          scrollTop: 1300,
          scrollHeight: 2000,
          containerHeight: 100,
          anchor: {
            _tag: 'Row',
            key: 'visible',
            index: 10,
            viewportOffset: 0,
          },
        }),
      )
      const prepend = prependHistory(
        observed.model,
        ['new', 'earlier', 'visible'],
        [{ key: 'new', estimatedHeightPx: 30 }],
      )
      const staleScroll = update(
        prepend.model,
        Message.ObservedContainerScroll({
          scrollTop: 1300,
          scrollHeight: 2000,
          containerHeight: 100,
          layoutVersion: 0,
          anchor: {
            _tag: 'Row',
            key: 'visible',
            index: 10,
            viewportOffset: 0,
          },
        }),
      )
      expect(staleScroll.model.viewportAnchor).toStrictEqual({
        _tag: 'Row',
        key: 'visible',
        index: 11,
        viewportOffset: 0,
      })
      const measurement = update(
        staleScroll.model,
        Message.MeasuredRows({
          measurements: [
            {
              key: 'earlier',
              index: 6,
              height: 50,
              layoutHeightPx: 30,
              layoutVersion: prepend.model.layoutVersion,
            },
          ],
        }),
      )

      expect(measurement.model.startPaddingPx).toBe(1000)
      expect(measurement.commands).toBeUndefined()
    })

    it('reconciles a visible row when a later history row measures taller', ({
      virtualList: { historyInit, update },
    }) => {
      const initialModel = historyInit()
      const scrolled = update(
        initialModel,
        Message.ObservedContainerScroll({
          scrollTop: -160,
          scrollHeight: 2000,
          containerHeight: 100,
          anchor: {
            _tag: 'Row',
            key: 'visible',
            index: 10,
            viewportOffset: 0,
          },
        }),
      )

      Story.story(
        update,
        Story.given(scrolled.model),
        Story.message(
          Message.MeasuredRows({
            measurements: [
              {
                key: 'later',
                index: 12,
                height: 80,
                layoutHeightPx: 30,
                layoutVersion: scrolled.model.layoutVersion,
              },
            ],
          }),
        ),
        Story.Command.expectHas(ApplyScroll),
        Story.Command.resolve(ApplyScroll, completedApplyScroll(1)),
      )
    })

    it('stores measurements from the current layout and reconciles the anchor', ({
      virtualList: { update, defaultInit },
    }) => {
      const measurement = update(
        defaultInit(),
        Message.MeasuredRows({
          measurements: [{ key: 'row-1', height: 72, layoutVersion: 0 }],
        }),
      )

      expect(measurement.model.measuredRowHeights).toStrictEqual({
        'row-1': 72,
      })
      expect(measurement.commands ?? []).toHaveLength(1)
    })

    it('ignores stale measurements from a previous items layout', ({
      virtualList: { operations, defaultInit, update },
    }) => {
      const model = operations.informOfItemsChanged(defaultInit(), []).model
      const measurement = update(
        model,
        Message.MeasuredRows({
          measurements: [{ key: 'stale', height: 72, layoutVersion: 0 }],
        }),
      )

      expect(measurement.model.measuredRowHeights).toStrictEqual({})
      expect(measurement.commands).toBeUndefined()
    })
  })
})
