import { describe, it } from '@effect/vitest'

import { html } from '../../html/index.js'
import * as Scene from '../../test/scene.js'
import {
  MeasuredContainer,
  type Message,
  type Model,
  type ViewConfig,
  init,
  update,
  view,
} from './index.js'

const { div, span } = html<Message>()

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

const sceneView =
  (
    overrides: Omit<
      Partial<ViewConfig<Message, DemoItem>>,
      'model' | 'items' | 'itemToKey' | 'itemToView'
    > = {},
  ) =>
  (model: Model) =>
    view({
      items: demoItems,
      itemToKey: item => String(item.id),
      itemToView: item => div([], [span([], [item.label])]),
      overscan: 0,
      ...overrides,
      model,
    })

const unmeasuredModel = init({ id: 'test', rowHeightPx: ROW_HEIGHT })

const measuredModel = (() => {
  const [model] = update(
    unmeasuredModel,
    MeasuredContainer({ containerHeight: 90 }),
  )
  return model
})()

const container = Scene.selector('ul[data-virtual-list-id="test"]')
const rows = Scene.all.selector('li[data-virtual-list-item-index]')
const topSpacer = Scene.first(Scene.all.selector('li[role="presentation"]'))

describe('VirtualList scene', () => {
  describe('container', () => {
    it('renders as a ul with id, the data-virtual-list-id selector the subscription relies on, and an explicit role=list for Safari + VoiceOver compatibility', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(unmeasuredModel),
        Scene.expect(container).toExist(),
        Scene.expect(container).toHaveAttr('id', 'test'),
        Scene.expect(container).toHaveAttr('role', 'list'),
      )
    })

    it('sets overflow: auto inline so the container scrolls', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(unmeasuredModel),
        Scene.expect(container).toHaveStyle('overflow', 'auto'),
      )
    })

    it('applies the consumer className when provided', () => {
      Scene.scene(
        { update, view: sceneView({ className: 'h-96 bg-white' }) },
        Scene.with(unmeasuredModel),
        Scene.expect(container).toHaveClass('h-96'),
        Scene.expect(container).toHaveClass('bg-white'),
      )
    })
  })

  describe('unmeasured state', () => {
    it('renders no rows before the container is measured', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(unmeasuredModel),
        Scene.expectAll(rows).toHaveCount(0),
      )
    })
  })

  describe('measured state', () => {
    it('renders the visible slice of rows once the container is measured', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(measuredModel),
        Scene.expectAll(rows).toHaveCount(3),
      )
    })

    it('keys rendered rows by data-virtual-list-item-index in slice order', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toExist(),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="1"]'),
        ).toExist(),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="2"]'),
        ).toExist(),
      )
    })

    it('sets each row wrapper to the configured rowHeightPx via inline style', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveStyle('height', `${ROW_HEIGHT}px`),
      )
    })

    it('uses display: grid on row wrappers so consumer content fills the height', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(measuredModel),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveStyle('display', 'grid'),
      )
    })

    it('marks the spacer li elements with role=presentation so they do not break the list semantics', () => {
      Scene.scene(
        { update, view: sceneView() },
        Scene.with(measuredModel),
        Scene.expect(topSpacer).toHaveAttr('role', 'presentation'),
      )
    })
  })
})
