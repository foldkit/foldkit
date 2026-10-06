import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import {
  Message,
  type Model,
  ObserveVirtualList,
  type RowHeightInputs,
  ScrollTarget,
  type ViewInputs,
  init,
  update,
  view,
} from './index.js'

type DemoItem = Readonly<{ id: number; label: string }>

const demoItems: ReadonlyArray<DemoItem> = [
  { id: 0, label: 'Item 0' },
  { id: 1, label: 'Item 1' },
  { id: 2, label: 'Item 2' },
  { id: 3, label: 'Item 3' },
  { id: 4, label: 'Item 4' },
  { id: 5, label: 'Item 5' },
  { id: 6, label: 'Item 6' },
  { id: 7, label: 'Item 7' },
  { id: 8, label: 'Item 8' },
  { id: 9, label: 'Item 9' },
]

const ROW_HEIGHT = 30

type SceneViewOverrides = Readonly<{
  containerClassName?: string
  contentAlignment?: 'Start' | 'End'
}> &
  RowHeightInputs<DemoItem>

const sceneView =
  (overrides: SceneViewOverrides = {}) =>
  (model: Model, h: HtmlBuilder<Message>) => {
    const baseViewInputs = {
      items: demoItems,
      itemToKey: (item: DemoItem) => String(item.id),
      itemToView: (item: DemoItem) => h.div([], [h.span([], [item.label])]),
      overscan: 0,
      ...(overrides.containerClassName === undefined
        ? {}
        : { containerClassName: overrides.containerClassName }),
      ...(overrides.contentAlignment === undefined
        ? {}
        : { contentAlignment: overrides.contentAlignment }),
    }
    const render = (viewInputs: ViewInputs<DemoItem>) =>
      view<DemoItem>()(model, viewInputs, h)

    if (overrides.itemToRowHeightPx !== undefined) {
      return render({
        ...baseViewInputs,
        itemToRowHeightPx: overrides.itemToRowHeightPx,
      })
    }

    if (overrides.dynamicRowHeights !== undefined) {
      return render({
        ...baseViewInputs,
        dynamicRowHeights: overrides.dynamicRowHeights,
        ...(overrides.itemToEstimatedRowHeightPx === undefined
          ? {}
          : {
              itemToEstimatedRowHeightPx: overrides.itemToEstimatedRowHeightPx,
            }),
      })
    }

    return render(baseViewInputs)
  }

const unmeasuredModel = init({ id: 'test', rowHeightPx: ROW_HEIGHT })

const measuredModel = (() => {
  const measurement = update(
    unmeasuredModel,
    Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
  )
  return measurement.model
})()

const container = Scene.selector('ul#test')
const rows = Scene.all.selector('li[data-virtual-list-item-index]')
const topSpacer = Scene.first(Scene.all.selector('li[role="presentation"]'))
const acknowledgeObserver = Scene.Mount.resolve(
  ObserveVirtualList({ id: 'test' }),
  Message.MeasuredRows({ measurements: [] }),
)

describe('VirtualList', () => {
  describe('container', () => {
    it('renders as a ul with id and explicit role=list for Safari + VoiceOver compatibility', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(unmeasuredModel),
        Scene.expect(container).toExist(),
        Scene.expect(container).toHaveAttr('id', 'test'),
        Scene.expect(container).toHaveAttr('role', 'list'),
        acknowledgeObserver,
      )
    })

    it('sets overflow: auto inline so the container scrolls', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(unmeasuredModel),
        Scene.expect(container).toHaveStyle('overflow', 'auto'),
        acknowledgeObserver,
      )
    })

    it('applies the consumer className when provided', () => {
      Scene.scene(
        { update, view: sceneView({ containerClassName: 'h-96 bg-white' }) },
        Scene.given(unmeasuredModel),
        Scene.expect(container).toHaveClass('h-96'),
        Scene.expect(container).toHaveClass('bg-white'),
        acknowledgeObserver,
      )
    })
  })

  describe('unmeasured state', () => {
    it('renders no rows before the container is measured', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(unmeasuredModel),
        Scene.expectAll(rows).toHaveCount(0),
        acknowledgeObserver,
      )
    })
  })

  describe('measured state', () => {
    it('renders the visible slice of rows once the container is measured', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expectAll(rows).toHaveCount(3),
        acknowledgeObserver,
      )
    })

    it('keys rendered rows by data-virtual-list-item-index in slice order', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toExist(),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="1"]'),
        ).toExist(),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="2"]'),
        ).toExist(),
        acknowledgeObserver,
      )
    })

    it('sets each row wrapper to the configured rowHeightPx via inline style', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveStyle('height', `${ROW_HEIGHT}px`),
        acknowledgeObserver,
      )
    })

    it('sets aria-setsize on each row to the full item count so screen readers announce the logical list size, not the mounted-row count', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('li[data-virtual-list-item-index="0"]'),
        ).toHaveAttr('aria-setsize', '10'),
        acknowledgeObserver,
      )
    })

    it('sets aria-posinset on each row to its 1-based logical position so screen readers announce "row N of total"', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('li[data-virtual-list-item-index="0"]'),
        ).toHaveAttr('aria-posinset', '1'),
        Scene.expect(
          Scene.selector('li[data-virtual-list-item-index="2"]'),
        ).toHaveAttr('aria-posinset', '3'),
        acknowledgeObserver,
      )
    })

    it('sets aria-posinset using the logical (data) index, not the slice index, when scrolled', () => {
      const scrolledUpdate = update(
        measuredModel,
        Message.ObservedContainerScroll({
          scrollTop: 90,
          scrollHeight: 300,
          containerHeight: 90,
          anchor: { _tag: 'None' },
        }),
      )
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(scrolledUpdate.model),
        Scene.expect(
          Scene.selector('li[data-virtual-list-item-index="3"]'),
        ).toHaveAttr('aria-posinset', '4'),
        acknowledgeObserver,
      )
    })

    it('uses display: grid on row wrappers so consumer content fills the height', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveStyle('display', 'grid'),
        acknowledgeObserver,
      )
    })

    it('marks the spacer li elements with role=presentation so they do not break the list semantics', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.given(measuredModel),
        Scene.expect(topSpacer).toHaveAttr('role', 'presentation'),
        acknowledgeObserver,
      )
    })
  })

  describe('variable row heights via itemToRowHeightPx', () => {
    const itemToRowHeightPx = (item: DemoItem): number =>
      item.id % 2 === 0 ? 60 : 20

    const variableMeasuredModel = (() => {
      const measuredUpdate = update(
        unmeasuredModel,
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )
      return measuredUpdate.model
    })()

    it('renders each row at the height returned by itemToRowHeightPx', () => {
      Scene.scene(
        { update, view: sceneView({ itemToRowHeightPx }) },
        Scene.given(variableMeasuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveStyle('height', '60px'),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="1"]'),
        ).toHaveStyle('height', '20px'),
        acknowledgeObserver,
      )
    })

    it('still picks the visible slice from cumulative heights', () => {
      Scene.scene(
        { update, view: sceneView({ itemToRowHeightPx }) },
        Scene.given(variableMeasuredModel),
        Scene.expectAll(rows).toHaveCount(3),
        acknowledgeObserver,
      )
    })
  })

  describe('end anchoring and measured rows', () => {
    it('renders the end window for a logical initial End target without reversing DOM order', () => {
      const endMeasurement = update(
        init({
          id: 'test',
          rowHeightPx: ROW_HEIGHT,
          initialScroll: { target: ScrollTarget.End() },
        }),
        Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
      )

      Scene.scene(
        { update, view: sceneView() },
        Scene.given(endMeasurement.model),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="7"]'),
        ).toHaveAttr('aria-posinset', '8'),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="9"]'),
        ).toHaveAttr('aria-posinset', '10'),
        acknowledgeObserver,
      )
    })

    it('bottom-aligns content shorter than the viewport when requested', () => {
      const shortItems = demoItems.slice(0, 2)
      const shortView = (model: Model, h: HtmlBuilder<Message>) =>
        view<DemoItem>()(
          model,
          {
            items: shortItems,
            itemToKey: item => String(item.id),
            itemToView: item => h.div([], [item.label]),
            overscan: 0,
            contentAlignment: 'End',
          },
          h,
        )

      Scene.scene(
        { update, view: shortView },
        Scene.given(measuredModel),
        Scene.expect(topSpacer).toHaveStyle('height', '30px'),
        acknowledgeObserver,
      )
    })

    it('marks dynamic rows for rendered-height observation', () => {
      Scene.scene(
        { update, view: sceneView({ dynamicRowHeights: true }) },
        Scene.given(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveAttr('data-virtual-list-measure', 'true'),
        acknowledgeObserver,
      )
    })
  })
})
