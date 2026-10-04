import { Array, Effect, Option, pipe } from 'effect'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { describe, expect, it } from 'vitest'

import {
  ApplyScroll,
  Message,
  type Model,
  type ScrollAlignment,
  ScrollTarget,
  informItemsChanged,
  init,
  scrollToEnd,
  scrollToIndex,
  scrollToIndexVariable,
  scrollToKey,
  scrollToOffset,
  update,
  visibleWindow,
  visibleWindowVariable,
} from './index.js'

const defaultInit = (): Model => init({ id: 'test', rowHeightPx: 30 })

const measuredInit = (containerHeight: number): Model => {
  const measurement = update(
    defaultInit(),
    Message.MeasuredContainer({ containerHeight }),
  )
  return measurement.model
}

type ScrollReturn = ReturnType<typeof scrollToIndex>

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
  const element = document.createElement('div')
  element.id = 'test'
  element.scrollTop = currentScrollTop
  element.setAttribute(
    'data-virtual-list-scroll-version',
    String(activeScrollVersion),
  )
  Object.defineProperty(element, 'clientHeight', { value: containerHeight })
  Object.defineProperty(element, 'scrollHeight', { value: scrollHeight })
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      top: 0,
      bottom: containerHeight,
      height: containerHeight,
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
        top: row.start - element.scrollTop,
        bottom: row.start + row.height - element.scrollTop,
        height: row.height,
        left: 0,
        right: 0,
        width: 100,
        x: 0,
        y: row.start - element.scrollTop,
        toJSON: () => ({}),
      }),
    })
    element.append(rowElement)
  }
  document.body.append(element)

  try {
    const maybeCommand = pipe(scrollReturn.commands ?? [], Array.head)
    if (Option.isNone(maybeCommand)) {
      throw new Error('Expected one scroll Command')
    }

    await Effect.runPromise(maybeCommand.value.effect)
    return element.scrollTop
  } finally {
    element.remove()
  }
}

const completedApplyScroll = (version: number) =>
  Message.CompletedApplyScroll({
    version,
    scrollTop: 0,
    scrollHeight: 1000,
    containerHeight: 300,
    anchor: { _tag: 'None' },
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
  })

  describe('ScrolledContainer', () => {
    it('writes the new scrollTop into the model', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
        Story.message(Message.ScrolledContainer({ scrollTop: 450 })),
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

  describe('MeasuredContainer', () => {
    it('transitions Unmeasured to Measured with the reported height', () => {
      Story.story(
        update,
        Story.given(defaultInit()),
        Story.message(Message.MeasuredContainer({ containerHeight: 600 })),
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
        Story.message(Message.MeasuredContainer({ containerHeight: 600 })),
        Story.message(Message.MeasuredContainer({ containerHeight: 720 })),
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
        Story.message(Message.MeasuredContainer({ containerHeight: 600 })),
        Story.Command.expectNone(),
      )
    })

    it('issues an apply-scroll Command on the initial transition when scrollTop is non-zero', () => {
      Story.story(
        update,
        Story.given(
          init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
        ),
        Story.message(Message.MeasuredContainer({ containerHeight: 300 })),
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
        Story.message(Message.MeasuredContainer({ containerHeight: 300 })),
        Story.message(Message.MeasuredContainer({ containerHeight: 320 })),
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

  describe('visibleWindow', () => {
    it('returns None while the container has not been measured', () => {
      const result = visibleWindow(defaultInit(), 100, 0)
      expect(Option.isNone(result)).toBe(true)
    })

    it('computes the slice from scrollTop, containerHeight, and rowHeightPx', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 0,
      })
      const result = visibleWindow(model, 1000, 0)

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(10)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(990 * 30)
      }
    })

    it('shifts the slice as scrollTop advances', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 600,
      })
      const result = visibleWindow(model, 1000, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(20)
        expect(result.value.endIndex).toBe(30)
        expect(result.value.topSpacerHeight).toBe(20 * 30)
        expect(result.value.bottomSpacerHeight).toBe(970 * 30)
      }
    })

    it('expands the slice by the overscan buffer on each side', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 600,
      })
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(15)
        expect(result.value.endIndex).toBe(35)
      }
    })

    it('clamps startIndex to 0 when overscan crosses the top edge', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 30,
      })
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
      }
    })

    it('clamps endIndex to itemCount when overscan crosses the bottom edge', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 0,
      })
      const result = visibleWindow(model, 8, 5)

      if (Option.isSome(result)) {
        expect(result.value.endIndex).toBe(8)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('produces an empty slice when itemCount is 0', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 0,
      })
      const result = visibleWindow(model, 0, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })
  })

  describe('visibleWindowVariable', () => {
    type Row = Readonly<{ height: number }>
    const rows: ReadonlyArray<Row> = [
      { height: 10 },
      { height: 20 },
      { height: 30 },
      { height: 40 },
      { height: 50 },
    ]
    const heightOf = (row: Row): number => row.height
    const totalHeight = 150

    it('returns None while the container has not been measured', () => {
      const result = visibleWindowVariable(defaultInit(), rows, heightOf, 0)
      expect(Option.isNone(result)).toBe(true)
    })

    it('computes the slice from cumulative heights at scrollTop 0', () => {
      const model: Model = modifyFields(measuredInit(60), {
        scrollTop: () => 0,
      })
      const result = visibleWindowVariable(model, rows, heightOf, 0)

      expect(Option.isSome(result)).toBe(true)
      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(3)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(totalHeight - 60)
      }
    })

    it('shifts the slice into rows whose offsets straddle scrollTop', () => {
      const model: Model = modifyFields(measuredInit(60), {
        scrollTop: () => 25,
      })
      const result = visibleWindowVariable(model, rows, heightOf, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(1)
        expect(result.value.endIndex).toBe(4)
        expect(result.value.topSpacerHeight).toBe(10)
        expect(result.value.bottomSpacerHeight).toBe(totalHeight - 100)
      }
    })

    it('expands the slice by overscan and recomputes spacers from cumulative heights', () => {
      const model: Model = modifyFields(measuredInit(60), {
        scrollTop: () => 25,
      })
      const result = visibleWindowVariable(model, rows, heightOf, 1)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(5)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('clamps the slice to itemCount when scrollTop exceeds total content height', () => {
      const model: Model = modifyFields(measuredInit(60), {
        scrollTop: () => 1000,
      })
      const result = visibleWindowVariable(model, rows, heightOf, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(rows.length)
        expect(result.value.endIndex).toBe(rows.length)
        expect(result.value.topSpacerHeight).toBe(totalHeight)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('produces an empty slice when items is empty', () => {
      const model: Model = modifyFields(measuredInit(60), {
        scrollTop: () => 0,
      })
      const result = visibleWindowVariable(model, [], heightOf, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })
  })

  describe('scrollToIndexVariable', () => {
    type Row = Readonly<{ height: number }>
    const rows: ReadonlyArray<Row> = [
      { height: 10 },
      { height: 20 },
      { height: 30 },
      { height: 40 },
    ]
    const heightOf = (row: Row): number => row.height

    it('bumps the version and stores the target index in pendingScroll', () => {
      const variableIndexScroll = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        2,
      )
      expect(variableIndexScroll.model.pendingScrollVersion).toBe(1)
      expect(variableIndexScroll.model.pendingScroll._tag).toBe('Pending')
      if (variableIndexScroll.model.pendingScroll._tag === 'Pending') {
        expect(variableIndexScroll.model.pendingScroll.request).toStrictEqual({
          _tag: 'Target',
          target: { _tag: 'Index', index: 2 },
          alignment: 'Start',
        })
        expect(variableIndexScroll.model.pendingScroll.version).toBe(1)
      }
      expect(variableIndexScroll.commands ?? []).toHaveLength(1)
    })

    it('increments the version monotonically across calls', () => {
      const firstScroll = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        1,
      )
      const secondScroll = scrollToIndexVariable(
        firstScroll.model,
        rows,
        heightOf,
        2,
      )
      expect(firstScroll.model.pendingScrollVersion).toBe(1)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)
    })

    it('emits an ApplyScroll Command per call', () => {
      const variableIndexScroll = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        3,
      )
      expect(variableIndexScroll.commands ?? []).toHaveLength(1)
    })

    it('aligns from cumulative row offsets', async () => {
      const variableIndexScroll = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        2,
        { alignment: 'Center' },
      )
      const scrollTop = await executeScroll(variableIndexScroll, 0, 50, [
        { index: 2, key: 'row-2', start: 30, height: 30 },
      ])

      expect(scrollTop).toBe(20)
    })
  })

  describe('uniform-vs-variable agreement', () => {
    type Row = Readonly<{ height: number }>
    const rows: ReadonlyArray<Row> = Array.makeBy(50, () => ({ height: 30 }))
    const constantHeight = (): number => 30

    it('visibleWindow and visibleWindowVariable produce the same slice for uniform-height inputs', () => {
      const model: Model = modifyFields(measuredInit(300), {
        scrollTop: () => 600,
      })
      const uniform = visibleWindow(model, rows.length, 5)
      const variable = visibleWindowVariable(model, rows, constantHeight, 5)

      expect(Option.isSome(uniform)).toBe(true)
      expect(Option.isSome(variable)).toBe(true)
      if (Option.isSome(uniform) && Option.isSome(variable)) {
        expect(variable.value.startIndex).toBe(uniform.value.startIndex)
        expect(variable.value.endIndex).toBe(uniform.value.endIndex)
        expect(variable.value.topSpacerHeight).toBe(
          uniform.value.topSpacerHeight,
        )
        expect(variable.value.bottomSpacerHeight).toBe(
          uniform.value.bottomSpacerHeight,
        )
      }
    })
  })
})
