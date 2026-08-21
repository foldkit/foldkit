import { Array, Option } from 'effect'
import * as Story from 'foldkit/story'
import { describe, expect, it } from 'vitest'

import {
  ApplyScroll,
  Message,
  type Model,
  init,
  scrollToIndex,
  scrollToIndexVariable,
  update,
  visibleWindow,
  visibleWindowVariable,
} from './index.js'

const defaultInit = (): Model => init({ id: 'test', rowHeightPx: 30 })

const measuredInit = (containerHeight: number): Model => {
  const updateResult = update(
    defaultInit(),
    Message.MeasuredContainer({ containerHeight }),
  )
  return updateResult.model
}

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
    })

    it('honors initialScrollTop when provided', () => {
      const model = init({
        id: 'test',
        rowHeightPx: 30,
        initialScrollTop: 600,
      })
      expect(model.scrollTop).toBe(600)
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
          expect(model.pendingScroll._tag).toBe('ScrollingToIndex')
          if (model.pendingScroll._tag === 'ScrollingToIndex') {
            expect(model.pendingScroll.index).toBe(20)
          }
          expect(model.pendingScrollVersion).toBe(1)
        }),
        Story.Command.resolve(
          ApplyScroll,
          Message.CompletedApplyScroll({ version: 1 }),
        ),
      )
    })

    it('issues no Command on subsequent MeasuredContainer once already Measured (resize-only path)', () => {
      Story.story(
        update,
        Story.given(
          init({ id: 'test', rowHeightPx: 30, initialScrollTop: 600 }),
        ),
        Story.message(Message.MeasuredContainer({ containerHeight: 300 })),
        Story.Command.resolve(
          ApplyScroll,
          Message.CompletedApplyScroll({ version: 1 }),
        ),
        Story.message(Message.MeasuredContainer({ containerHeight: 320 })),
        Story.Command.expectNone(),
      )
    })
  })

  describe('CompletedApplyScroll', () => {
    it('clears pendingScroll when the version matches', () => {
      const baseModel = defaultInit()
      const scrollToIndexResult = scrollToIndex(baseModel, 50)
      expect(scrollToIndexResult.model.pendingScroll._tag).toBe(
        'ScrollingToIndex',
      )

      const updateResult = update(
        scrollToIndexResult.model,
        Message.CompletedApplyScroll({
          version: scrollToIndexResult.model.pendingScrollVersion,
        }),
      )
      expect(updateResult.model.pendingScroll._tag).toBe('Idle')
    })

    it('ignores a stale completion when a newer scroll is in flight', () => {
      const firstScroll = scrollToIndex(defaultInit(), 10)
      const secondScroll = scrollToIndex(firstScroll.model, 20)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)

      const updateResult = update(
        secondScroll.model,
        Message.CompletedApplyScroll({ version: 1 }),
      )
      expect(updateResult.model.pendingScroll._tag).toBe('ScrollingToIndex')
      if (updateResult.model.pendingScroll._tag === 'ScrollingToIndex') {
        expect(updateResult.model.pendingScroll.version).toBe(2)
      }
    })
  })

  describe('scrollToIndex', () => {
    it('bumps the version and stores the target index in pendingScroll', () => {
      const scrollResult = scrollToIndex(defaultInit(), 42)
      expect(scrollResult.model.pendingScrollVersion).toBe(1)
      expect(scrollResult.model.pendingScroll._tag).toBe('ScrollingToIndex')
      if (scrollResult.model.pendingScroll._tag === 'ScrollingToIndex') {
        expect(scrollResult.model.pendingScroll.index).toBe(42)
        expect(scrollResult.model.pendingScroll.version).toBe(1)
      }
      expect(scrollResult.commands ?? []).toHaveLength(1)
    })

    it('increments the version monotonically across calls', () => {
      const firstScroll = scrollToIndex(defaultInit(), 10)
      const secondScroll = scrollToIndex(firstScroll.model, 20)
      const thirdScroll = scrollToIndex(secondScroll.model, 30)
      expect(firstScroll.model.pendingScrollVersion).toBe(1)
      expect(secondScroll.model.pendingScrollVersion).toBe(2)
      expect(thirdScroll.model.pendingScrollVersion).toBe(3)
    })
  })

  describe('visibleWindow', () => {
    it('returns None while the container has not been measured', () => {
      const result = visibleWindow(defaultInit(), 100, 0)
      expect(Option.isNone(result)).toBe(true)
    })

    it('computes the slice from scrollTop, containerHeight, and rowHeightPx', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
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
      const model: Model = { ...measuredInit(300), scrollTop: 600 }
      const result = visibleWindow(model, 1000, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(20)
        expect(result.value.endIndex).toBe(30)
        expect(result.value.topSpacerHeight).toBe(20 * 30)
        expect(result.value.bottomSpacerHeight).toBe(970 * 30)
      }
    })

    it('expands the slice by the overscan buffer on each side', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 600 }
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(15)
        expect(result.value.endIndex).toBe(35)
      }
    })

    it('clamps startIndex to 0 when overscan crosses the top edge', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 30 }
      const result = visibleWindow(model, 1000, 5)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.topSpacerHeight).toBe(0)
      }
    })

    it('clamps endIndex to itemCount when overscan crosses the bottom edge', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
      const result = visibleWindow(model, 8, 5)

      if (Option.isSome(result)) {
        expect(result.value.endIndex).toBe(8)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('produces an empty slice when itemCount is 0', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 0 }
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
      const model: Model = { ...measuredInit(60), scrollTop: 0 }
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
      const model: Model = { ...measuredInit(60), scrollTop: 25 }
      const result = visibleWindowVariable(model, rows, heightOf, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(1)
        expect(result.value.endIndex).toBe(4)
        expect(result.value.topSpacerHeight).toBe(10)
        expect(result.value.bottomSpacerHeight).toBe(totalHeight - 100)
      }
    })

    it('expands the slice by overscan and recomputes spacers from cumulative heights', () => {
      const model: Model = { ...measuredInit(60), scrollTop: 25 }
      const result = visibleWindowVariable(model, rows, heightOf, 1)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(0)
        expect(result.value.endIndex).toBe(5)
        expect(result.value.topSpacerHeight).toBe(0)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('clamps the slice to itemCount when scrollTop exceeds total content height', () => {
      const model: Model = { ...measuredInit(60), scrollTop: 1000 }
      const result = visibleWindowVariable(model, rows, heightOf, 0)

      if (Option.isSome(result)) {
        expect(result.value.startIndex).toBe(rows.length)
        expect(result.value.endIndex).toBe(rows.length)
        expect(result.value.topSpacerHeight).toBe(totalHeight)
        expect(result.value.bottomSpacerHeight).toBe(0)
      }
    })

    it('produces an empty slice when items is empty', () => {
      const model: Model = { ...measuredInit(60), scrollTop: 0 }
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
      const scrollToIndexVariableResult = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        2,
      )
      expect(scrollToIndexVariableResult.model.pendingScrollVersion).toBe(1)
      expect(scrollToIndexVariableResult.model.pendingScroll._tag).toBe(
        'ScrollingToIndex',
      )
      if (
        scrollToIndexVariableResult.model.pendingScroll._tag ===
        'ScrollingToIndex'
      ) {
        expect(scrollToIndexVariableResult.model.pendingScroll.index).toBe(2)
        expect(scrollToIndexVariableResult.model.pendingScroll.version).toBe(1)
      }
      expect(scrollToIndexVariableResult.commands ?? []).toHaveLength(1)
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
      const scrollResult = scrollToIndexVariable(
        defaultInit(),
        rows,
        heightOf,
        3,
      )
      expect(scrollResult.commands ?? []).toHaveLength(1)
    })
  })

  describe('uniform-vs-variable agreement', () => {
    type Row = Readonly<{ height: number }>
    const rows: ReadonlyArray<Row> = Array.makeBy(50, () => ({ height: 30 }))
    const constantHeight = (): number => 30

    it('visibleWindow and visibleWindowVariable produce the same slice for uniform-height inputs', () => {
      const model: Model = { ...measuredInit(300), scrollTop: 600 }
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
