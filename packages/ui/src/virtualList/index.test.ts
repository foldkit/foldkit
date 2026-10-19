import { Array, Deferred, Effect, Option, Stream, pipe } from 'effect'
import * as Mount from 'foldkit/mount'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import {
  ApplyScroll,
  ApplyScrollOutcome,
  Message,
  type Model,
  ObserveVirtualList,
  type ScrollAlignment,
  ScrollTarget,
  informItemsChanged,
  init,
  scrollToEnd,
  scrollToIndex,
  scrollToKey,
  scrollToOffset,
  update,
} from './index.js'

const defaultInit = (): Model => init({ id: 'test', rowHeightPx: 30 })

type ScrollReturn = ReturnType<typeof scrollToIndex>

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
        yield* maybeCommand.value.effect

        return element.scrollTop
      }),
    ),
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
  describe('init', () => {
    it('starts in the Unmeasured state with scrollTop 0 and pendingScroll Idle', () => {
      const model = defaultInit()
      expect(model.id).toBe('test')
      expect(model.rowHeightPx).toBe(30)
      expect(model.scrollTop).toBe(0)
      expect(model.measurement._tag).toBe('Unmeasured')
      expect(model.pendingScroll._tag).toBe('Idle')
      expect(model.pendingScrollVersion).toBe(0)
      expect(model.measuredRowHeights).toStrictEqual({})
    })

    it('keeps initialScrollTop as an offset target for compatibility', () => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScrollTop: 600,
      })
      expect(model.scrollTop).toBe(600)
      expect(model.initialScroll._tag).toBe('Pending')
    })

    it('accepts a logical initial End target and follow-end threshold', () => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
        followEnd: { thresholdPx: 8 },
      })

      expect(model.initialScroll._tag).toBe('Pending')
      expect(model.endBehavior).toStrictEqual({
        _tag: 'Follow',
        thresholdPx: 8,
      })
    })

    it('keeps an initial End target until rows arrive after an empty mount', () => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
      })
      const measured = update(
        initialModel,
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )
      const emptyScroll = update(
        measured.model,
        completedApplyScroll(measured.model.pendingScrollVersion),
      )

      expect(emptyScroll.model.initialScroll._tag).toBe('Pending')

      const arrived = informItemsChanged(emptyScroll.model, ['first', 'last'])
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

    it('retries an initial key target after its key arrives', () => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.Key({ key: 'wanted' }) },
      })
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

      const arrived = informItemsChanged(missing.model, ['wanted'])
      expect(arrived.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: {
          _tag: 'Target',
          target: { _tag: 'Key', key: 'wanted' },
        },
      })
    })

    it('lets an explicit scroll supersede a deferred initial target', () => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.Key({ key: 'wanted' }) },
      })
      const explicitScroll = scrollToEnd(initialModel)

      expect(explicitScroll.model.initialScroll._tag).toBe('Applied')
      expect(explicitScroll.model.pendingScroll).toMatchObject({
        _tag: 'Pending',
        request: { _tag: 'Target', target: { _tag: 'End' } },
      })
    })

    it('lets a user scroll supersede an initial target even before a row is visible', () => {
      const initialModel = init({
        id: 'test',
        rowHeightPx: 30,
        initialScroll: { target: ScrollTarget.End() },
      })
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
    it('writes the new scrollTop into the model', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
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
      )
    })

    it('tracks End while follow-end is within its threshold and a Row after the user scrolls away', () => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        followEnd: { thresholdPx: 5 },
      })
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

    it('replaces an in-flight request with the live user scroll anchor', () => {
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
      const changed = informItemsChanged(scrolled.model, ['row-20'])
      expect(changed.model.pendingScroll._tag).toBe('Pending')
      if (changed.model.pendingScroll._tag === 'Pending') {
        expect(changed.model.pendingScroll.request).toStrictEqual({
          _tag: 'Anchor',
          anchor: {
            _tag: 'Row',
            key: 'row-20',
            index: 20,
            viewportOffset: -4,
          },
        })
      }
    })
  })

  describe('ResizedContainer', () => {
    it('transitions Unmeasured to Measured with the reported height', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
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
      )
    })

    it('updates the height when already Measured', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
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
      )
    })

    it('issues no Command on the initial Unmeasured to Measured transition when scrollTop is 0', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
        Story.message(
          Message.ResizedContainer({
            containerWidth: 320,
            containerHeight: 600,
          }),
        ),
        Story.Command.expectNone(),
      )
    })

    it('issues an apply-scroll Command on the initial transition when scrollTop is non-zero', () => {
      Story.story(
        update,
        Story.given(
          init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
        ),
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
      )
    })

    it('reconciles the stored viewport anchor after a later resize', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
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
      )
    })

    it('invalidates cached row measurements when the container width changes', () => {
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
    it('clears pendingScroll when the version matches', () => {
      const baseModel = defaultInit()
      const indexScroll = scrollToIndex(baseModel, 50)
      expect(indexScroll.model.pendingScroll._tag).toBe('Pending')

      const completion = update(
        indexScroll.model,
        completedApplyScroll(indexScroll.model.pendingScrollVersion),
      )
      expect(completion.model.pendingScroll._tag).toBe('Idle')
    })

    it('ignores a stale completion when a newer scroll is in flight', () => {
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
    it('bumps the version and stores the target index in pendingScroll', () => {
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

    it('increments the version monotonically across calls', () => {
      const firstScroll = scrollToIndex(defaultInit(), 10)
      const secondScroll = scrollToIndex(firstScroll.model, 20)
      const thirdScroll = scrollToIndex(secondScroll.model, 30)
      expect(firstScroll.model.pendingScrollVersion).toBe(1)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)
      expect(thirdScroll.model.pendingScrollVersion).toBe(3)
    })

    it('skips a stale request after a newer view has committed', async () => {
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

    it.each(alignmentCases)(
      'aligns the row to $alignment',
      async ({ alignment, currentScrollTop, expectedScrollTop }) => {
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

    it('uses the nearest edge when the row is outside the viewport', async () => {
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

    it('clamps aligned scroll positions at the start of the list', async () => {
      const indexScroll = scrollToIndex(defaultInit(), 0, {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(indexScroll, 300, 90, [
        { index: 0, key: 'row-0', start: 0, height: 30 },
      ])

      expect(scrollTop).toBe(0)
    })

    it('aligns a row to the scrollport inside a bordered container', async () => {
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

    it('aligns a variable-height row from its rendered offset', async () => {
      const indexScroll = scrollToIndex(defaultInit(), 2, {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(indexScroll, 0, 50, [
        { index: 2, key: 'row-2', start: 30, height: 30 },
      ])

      expect(scrollTop).toBe(20)
    })

    it('targets its own row when a row contains another VirtualList', async () => {
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
    it('scrolls to the row whose key matches', async () => {
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

    it('aligns from the live rendered row height', async () => {
      const keyScroll = scrollToKey(defaultInit(), 'third', {
        alignment: 'Center',
      })
      const scrollTop = await executeScroll(keyScroll, 0, 50, [
        { index: 2, key: 'third', start: 30, height: 30 },
      ])

      expect(scrollTop).toBe(20)
    })

    it('leaves scrollTop unchanged when the rendered key is absent', async () => {
      const keyScroll = scrollToKey(defaultInit(), 'missing')
      const scrollTop = await executeScroll(keyScroll, 40, 50)

      expect(scrollTop).toBe(40)
    })
  })

  describe('scrollToOffset', () => {
    it('scrolls to the requested pixel offset', async () => {
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

    it('scrolls a mounted container inside a shadow root', async () => {
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

    it('does not route a scroll to another shadow root with the same id', async () => {
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

              return yield* maybeCommand.value.effect
            }),
          ),
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

    it('does not scroll a container while its Mount is paused', async () => {
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

              return yield* maybeCommand.value.effect
            }),
          ),
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

    it('clamps a negative pixel offset to zero', async () => {
      const offsetScroll = scrollToOffset(defaultInit(), -10)
      const scrollTop = await executeScroll(offsetScroll, 200, 90, [], 500)

      expect(scrollTop).toBe(0)
    })

    it('clamps a pixel offset to the live maximum', async () => {
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
    it('uses the live scrollHeight and container height', async () => {
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

  describe('informItemsChanged', () => {
    it('bumps the layout version and reconciles the stored anchor', () => {
      const itemChange = informItemsChanged(defaultInit(), ['first', 'second'])

      expect(itemChange.model.layoutVersion).toBe(1)
      expect(itemChange.model.pendingScroll._tag).toBe('Pending')
      if (itemChange.model.pendingScroll._tag === 'Pending') {
        expect(itemChange.model.pendingScroll.request._tag).toBe('Anchor')
      }
      expect(itemChange.commands ?? []).toHaveLength(1)
    })
  })

  describe('MeasuredRows', () => {
    it('stores measurements from the current layout and reconciles the anchor', () => {
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

    it('ignores stale measurements from a previous items layout', () => {
      const model = informItemsChanged(defaultInit(), []).model
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
