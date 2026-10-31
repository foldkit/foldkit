import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Result } from 'foldkit/block'
import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'

import { describe, expect, it } from '@effect/vitest'

import {
  AccessibleSet,
  type ApplyScroll,
  type InitConfig,
  Message,
  type Model,
  ObserveVirtualList,
  type RowHeightInputs,
  ScrollTarget,
  type ViewInputs,
  initialModel,
  makeBlock,
  update as updateHandlers,
} from './virtualList.js'

const tagOf = (message: Readonly<{ _tag: string }>): string => message._tag

type DemoItem = Readonly<{ id: number; label: string }>

const update = (
  model: Model,
  message: Message,
): Result<Model, unknown, ReturnType<typeof ApplyScroll>> => {
  const handler: (
    model: Model,
    message: Message,
  ) => Result<Model, unknown, ReturnType<typeof ApplyScroll>> = Reflect.get(
    updateHandlers,
    tagOf(message),
  )
  return handler(model, message)
}

const DemoList = makeBlock<DemoItem>()

type HostArgs = Readonly<{
  config: InitConfig
  toViewInputs: (h: HtmlBuilder<never>) => ViewInputs<DemoItem>
}>

class Host extends Block<Host, HostArgs>()('Host', {
  Model: Schema.Struct({ list: DemoList }),
}) {}

const HostLive = Host.make(
  Effect.fn(function* (_id, { config, toViewInputs }) {
    const list = yield* new DemoList('list', config)
    return {
      model: { list },
      view: (model, h) => model.list.view(toViewInputs(h)),
    }
  }),
).pipe(Layer.provide(DemoList.Live))

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

const listConfig: InitConfig = { id: 'test', rowHeightPx: ROW_HEIGHT }

type SceneViewOverrides = Readonly<{
  containerClassName?: string
  contentAlignment?: 'Start' | 'End'
  accessibleSet?: AccessibleSet
}> &
  RowHeightInputs<DemoItem>

const sceneView =
  (overrides: SceneViewOverrides = {}) =>
  (h: HtmlBuilder<never>): ViewInputs<DemoItem> => {
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
      ...(overrides.accessibleSet === undefined
        ? {}
        : { accessibleSet: overrides.accessibleSet }),
    }

    if (overrides.itemToRowHeightPx !== undefined) {
      return {
        ...baseViewInputs,
        itemToRowHeightPx: overrides.itemToRowHeightPx,
      }
    }

    if (overrides.dynamicRowHeights !== undefined) {
      return {
        ...baseViewInputs,
        dynamicRowHeights: overrides.dynamicRowHeights,
        ...(overrides.itemToEstimatedRowHeightPx === undefined
          ? {}
          : {
              itemToEstimatedRowHeightPx: overrides.itemToEstimatedRowHeightPx,
            }),
      }
    }

    return baseViewInputs
  }

const hostArgs = (
  toViewInputs: HostArgs['toViewInputs'] = sceneView(),
): HostArgs => ({ config: listConfig, toViewInputs })

const unmeasuredModel = initialModel(listConfig)

const measuredModel = update(
  unmeasuredModel,
  Message.ResizedContainer({ containerWidth: 320, containerHeight: 90 }),
).model

const container = Scene.selector('ul#test')
const rows = Scene.all.selector('li[data-virtual-list-item-index]')
const topSpacer = Scene.first(Scene.all.selector('li[role="presentation"]'))
const acknowledgeObserver = Scene.Mount.resolve(
  ObserveVirtualList({ id: 'test' }),
  Message.MeasuredRows({ measurements: [] }),
)

describe('VirtualList', () => {
  describe('container', () => {
    it.effect(
      'renders as a ul with id and explicit role=list for Safari + VoiceOver compatibility',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: unmeasuredModel }),
          Scene.expect(container).toExist(),
          Scene.expect(container).toHaveAttr('id', 'test'),
          Scene.expect(container).toHaveAttr('role', 'list'),
          acknowledgeObserver,
        )
      },
    )

    it.effect('sets overflow: auto inline so the container scrolls', () => {
      return Scene.scene(
        HostLive,
        hostArgs(),
        Scene.given({ list: unmeasuredModel }),
        Scene.expect(container).toHaveStyle('overflow', 'auto'),
        acknowledgeObserver,
      )
    })

    it.effect('applies the consumer className when provided', () => {
      return Scene.scene(
        HostLive,
        hostArgs(sceneView({ containerClassName: 'h-96 bg-white' })),
        Scene.given({ list: unmeasuredModel }),
        Scene.expect(container).toHaveClass('h-96'),
        Scene.expect(container).toHaveClass('bg-white'),
        acknowledgeObserver,
      )
    })
  })

  describe('unmeasured state', () => {
    it.effect('renders no rows before the container is measured', () => {
      return Scene.scene(
        HostLive,
        hostArgs(),
        Scene.given({ list: unmeasuredModel }),
        Scene.expectAll(rows).toHaveCount(0),
        acknowledgeObserver,
      )
    })
  })

  describe('measured state', () => {
    it.effect(
      'reuses dynamic row offsets when only the scroll position changes',
      () => {
        const items = Array.makeBy(10_000, id => ({ id, label: `Item ${id}` }))
        const itemToKey = (item: DemoItem) => String(item.id)
        let estimateCount = 0
        const itemToEstimatedRowHeightPx = () => {
          estimateCount += 1
          return ROW_HEIGHT
        }
        const dynamicViewInputs = (
          h: HtmlBuilder<never>,
        ): ViewInputs<DemoItem> => ({
          items,
          itemToKey,
          itemToView: item => h.span([], [item.label]),
          dynamicRowHeights: true,
          itemToEstimatedRowHeightPx,
          overscan: 0,
        })

        return Scene.scene(
          HostLive,
          hostArgs(dynamicViewInputs),
          Scene.given({ list: measuredModel }),
          Scene.tap(() => {
            estimateCount = 0
          }),
          Scene.Mount.resolve(
            ObserveVirtualList({ id: 'test' }),
            Message.ObservedContainerScroll({
              scrollTop: 90,
              scrollHeight: 300_000,
              containerHeight: 90,
              anchor: { _tag: 'None' },
            }),
          ),
          Scene.tap(() => expect(estimateCount).toBe(0)),
        )
      },
    )

    it.effect(
      'renders the visible slice of rows once the container is measured',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expectAll(rows).toHaveCount(3),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'keys rendered rows by data-virtual-list-item-index in slice order',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
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
      },
    )

    it.effect(
      'sets each row wrapper to the configured rowHeightPx via inline style',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="0"]'),
          ).toHaveStyle('height', `${ROW_HEIGHT}px`),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'sets aria-setsize on each row to the full item count so screen readers announce the logical list size, not the mounted-row count',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="0"]'),
          ).toHaveAttr('aria-setsize', '10'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'sets aria-posinset on each row to its 1-based logical position so screen readers announce "row N of total"',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="0"]'),
          ).toHaveAttr('aria-posinset', '1'),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="2"]'),
          ).toHaveAttr('aria-posinset', '3'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'reports an unknown collection size while older rows can load',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(sceneView({ accessibleSet: AccessibleSet.Unknown() })),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="0"]'),
          ).toHaveAttr('aria-setsize', '-1'),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="2"]'),
          ).toHaveAttr('aria-posinset', '3'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'reports global positions when the full collection size is known',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(
            sceneView({
              accessibleSet: AccessibleSet.Known({
                size: 100,
                firstPosition: 91,
              }),
            }),
          ),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="0"]'),
          ).toHaveAttr('aria-setsize', '100'),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="2"]'),
          ).toHaveAttr('aria-posinset', '93'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'sets aria-posinset using the logical (data) index, not the slice index, when scrolled',
      () => {
        const scrolledUpdate = update(
          measuredModel,
          Message.ObservedContainerScroll({
            scrollTop: 90,
            scrollHeight: 300,
            containerHeight: 90,
            anchor: { _tag: 'None' },
          }),
        )
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: scrolledUpdate.model }),
          Scene.expect(
            Scene.selector('li[data-virtual-list-item-index="3"]'),
          ).toHaveAttr('aria-posinset', '4'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'uses display: grid on row wrappers so consumer content fills the height',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="0"]'),
          ).toHaveStyle('display', 'grid'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'marks the spacer li elements with role=presentation so they do not break the list semantics',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: measuredModel }),
          Scene.expect(topSpacer).toHaveAttr('role', 'presentation'),
          acknowledgeObserver,
        )
      },
    )
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

    it.effect(
      'renders each row at the height returned by itemToRowHeightPx',
      () => {
        return Scene.scene(
          HostLive,
          hostArgs(sceneView({ itemToRowHeightPx })),
          Scene.given({ list: variableMeasuredModel }),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="0"]'),
          ).toHaveStyle('height', '60px'),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="1"]'),
          ).toHaveStyle('height', '20px'),
          acknowledgeObserver,
        )
      },
    )

    it.effect('still picks the visible slice from cumulative heights', () => {
      return Scene.scene(
        HostLive,
        hostArgs(sceneView({ itemToRowHeightPx })),
        Scene.given({ list: variableMeasuredModel }),
        Scene.expectAll(rows).toHaveCount(3),
        acknowledgeObserver,
      )
    })
  })

  describe('end anchoring and measured rows', () => {
    it.effect(
      'renders the end window for a logical initial End target without reversing DOM order',
      () => {
        const endMeasurement = update(
          initialModel({
            id: 'test',
            rowHeightPx: ROW_HEIGHT,
            initialScroll: { target: ScrollTarget.End() },
          }),
          Message.ResizedContainer({
            containerWidth: 320,
            containerHeight: 90,
          }),
        )

        return Scene.scene(
          HostLive,
          hostArgs(),
          Scene.given({ list: endMeasurement.model }),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="7"]'),
          ).toHaveAttr('aria-posinset', '8'),
          Scene.expect(
            Scene.selector('[data-virtual-list-item-index="9"]'),
          ).toHaveAttr('aria-posinset', '10'),
          acknowledgeObserver,
        )
      },
    )

    it.effect(
      'bottom-aligns content shorter than the viewport when requested',
      () => {
        const shortItems = demoItems.slice(0, 2)
        const shortViewInputs = (
          h: HtmlBuilder<never>,
        ): ViewInputs<DemoItem> => ({
          items: shortItems,
          itemToKey: item => String(item.id),
          itemToView: item => h.div([], [item.label]),
          overscan: 0,
          contentAlignment: 'End',
        })

        return Scene.scene(
          HostLive,
          hostArgs(shortViewInputs),
          Scene.given({ list: measuredModel }),
          Scene.expect(topSpacer).toHaveStyle('height', '30px'),
          acknowledgeObserver,
        )
      },
    )

    it.effect('marks dynamic rows for rendered-height observation', () => {
      return Scene.scene(
        HostLive,
        hostArgs(sceneView({ dynamicRowHeights: true })),
        Scene.given({ list: measuredModel }),
        Scene.expect(
          Scene.selector('[data-virtual-list-item-index="0"]'),
        ).toHaveAttr('data-virtual-list-measure', 'true'),
        acknowledgeObserver,
      )
    })
  })
})
