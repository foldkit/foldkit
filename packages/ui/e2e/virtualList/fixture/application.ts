import { Array, Option, Schema, Tuple } from 'effect'
import { Block, Update } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import * as VirtualList from '@foldkit/ui/virtualList'

import {
  FixtureConfig,
  ROW_COUNT,
  ROW_HEIGHT_PX,
  SHORT_ROW_COUNT,
} from './config'

const RowContent = defineTaggedUnion({ Compact: {}, Expanded: {} })
const Item = Schema.Struct({
  id: Schema.String,
  index: Schema.Number,
  content: RowContent,
})
const ItemVirtualListBlock = VirtualList.create<typeof Item.Type>()
const Model = Schema.Struct({
  config: FixtureConfig,
  maybeList: Schema.Option(ItemVirtualListBlock.Model),
  items: Schema.Array(Item),
  precedingHeight: Schema.Number,
  containerHeight: Schema.Number,
})
const Message = defineMessageUnion({
  ClickedJumpToIndex: {},
  ClickedJumpToKey: {},
  ClickedJumpToOffset: {},
  ClickedJumpToNegativeOffset: {},
  ClickedJumpToHugeOffset: {},
  ClickedJumpToNearestFirst: {},
  ClickedJumpToEnd: {},
  ClickedExpandPreceding: {},
  ClickedResizeViewport: {},
  ClickedExpandRow: { index: Schema.Number },
  ClickedExpandPrecedingRow: {},
  ClickedAppendItem: {},
  ClickedUnmountList: {},
})
const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
  ChildInitContext: FixtureConfig,
})
const { makeFieldsStep, makeNoopStep, makeStep } = ApplicationDefinition

const scrollContainerFor = (config: typeof FixtureConfig.Type) => {
  if (config.scrollMode === 'Self') {
    return VirtualList.ScrollContainer.Self()
  } else if (config.scrollMode === 'Ancestor') {
    return VirtualList.ScrollContainer.Ancestor({ selector: '#main' })
  } else {
    return VirtualList.ScrollContainer.Window()
  }
}

const ListBinding = ApplicationDefinition.makeBinding(ItemVirtualListBlock, {
  field: 'maybeList',
  init: {
    contextToArgs: config =>
      Option.some(
        Tuple.make({
          id: 'virtual-list',
          rowHeightPx: ROW_HEIGHT_PX,
          scrollContainer: scrollContainerFor(config),
        }),
      ),
  },
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ItemVirtualListBlock, {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  }),
})
const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [ListBinding],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

const init = ApplicationComposition.makeInit(
  (config: typeof FixtureConfig.Type) => ({
    model: {
      config,
      items: Array.makeBy(
        config.isShort ? SHORT_ROW_COUNT : ROW_COUNT,
        index => ({
          id: `item-${index}`,
          index,
          content: RowContent.Compact(),
        }),
      ),
      precedingHeight: 800,
      containerHeight: 420,
    },
    childInitContext: config,
  }),
)

const update = ApplicationComposition.makeUpdate({
  ClickedJumpToIndex: ListBinding.requestScrollToIndex(120, {
    alignment: 'Start',
  }),
  ClickedJumpToKey: ListBinding.requestScrollToKey('item-180', {
    alignment: 'Center',
  }),
  ClickedJumpToOffset: ListBinding.requestScrollToOffset(2_025),
  ClickedJumpToNegativeOffset: ListBinding.requestScrollToOffset(-100),
  ClickedJumpToHugeOffset: ListBinding.requestScrollToOffset(1_000_000),
  ClickedJumpToNearestFirst: ListBinding.requestScrollToIndex(0, {
    alignment: 'Nearest',
  }),
  ClickedJumpToEnd: ListBinding.requestScrollToEnd(),
  ClickedExpandPreceding: makeFieldsStep(() => ({
    precedingHeight: height => height + 160,
  })),
  ClickedResizeViewport: makeFieldsStep(() => ({
    containerHeight: height => height - 80,
  })),
  ClickedExpandRow: (model, { index }) => ({
    model: modifyFields(model, {
      items: Array.map(item =>
        item.index === index
          ? modifyFields(item, { content: () => RowContent.Expanded() })
          : item,
      ),
    }),
  }),
  ClickedExpandPrecedingRow: model => {
    const maybePrecedingIndex = Option.flatMap(model.maybeList, list =>
      list.viewportAnchor._tag === 'Row'
        ? Option.some(Math.max(0, list.viewportAnchor.index - 1))
        : Option.none(),
    )

    return {
      model: modifyFields(model, {
        items: Array.map(item =>
          Option.contains(maybePrecedingIndex, item.index)
            ? modifyFields(item, { content: () => RowContent.Expanded() })
            : item,
        ),
      }),
    }
  },
  ClickedAppendItem: makeStep(model => {
    const nextItems = Array.append(model.items, {
      id: `item-${model.items.length}`,
      index: model.items.length,
      content: RowContent.Compact(),
    })

    return Update.combineSteps([
      makeFieldsStep(() => ({ items: () => nextItems })),
      ListBinding.informItemsChanged(Array.map(nextItems, item => item.id)),
    ])
  }),
  ClickedUnmountList: makeFieldsStep(() => ({
    maybeList: () => Option.none(),
  })),
})

const rowContent = (
  item: typeof Item.Type,
  isDynamic: boolean,
  h: ApplicationViewBuilder,
) => {
  const isExpanded = item.content._tag === 'Expanded'

  return h.button(
    [
      h.Class(
        `row-content${isDynamic ? ' dynamic' : ''}${isExpanded ? ' expanded' : ''}`,
      ),
      h.OnClick(Message.ClickedExpandRow({ index: item.index })),
      h.AriaLabel(`Expand item ${item.index}`),
    ],
    [`Item ${item.index}`],
  )
}

const virtualListView = (model: typeof Model.Type, h: ApplicationViewBuilder) =>
  Option.match(model.maybeList, {
    onNone: () => h.p([h.Id('unmounted')], ['List unmounted']),
    onSome: list => {
      const rowInputs: VirtualList.RowHeightInputs<typeof Item.Type> = model
        .config.isDynamic
        ? {
            dynamicRowHeights: true,
            itemToEstimatedRowHeightPx: () => ROW_HEIGHT_PX,
          }
        : {}
      const commonInputs = {
        ...rowInputs,
        items: model.items,
        itemToKey: (item: typeof Item.Type) => item.id,
        overscan: 3,
        containerClassName:
          model.config.scrollMode === 'Self' ? 'self-list' : 'external-list',
        containerAttributes: childAttributes([h.AriaLabel('Fixture items')]),
      }

      if (model.config.layout === 'Table') {
        return h.table(
          [
            h.AriaLabel('Fixture table'),
            h.AriaRowcount(model.items.length + 1),
          ],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  [
                    h.th([h.Scope('col')], ['Item']),
                    h.th([h.Scope('col')], ['Value']),
                  ],
                ),
              ],
            ),
            h.block(
              ListBinding.embedView({
                slotId: list.id,
                model: list,
                viewInputs: {
                  ...commonInputs,
                  containerElement: 'tbody',
                  rowElement: 'tr',
                  tableColumns: 2,
                  itemToAttributes: (_item, index) =>
                    childAttributes([h.AriaRowindex(index + 2)]),
                  itemToView: item => [
                    h.td([], [rowContent(item, model.config.isDynamic, h)]),
                    h.td([], [`Value ${item.index}`]),
                  ],
                },
              }),
            ),
          ],
        )
      } else {
        return h.block(
          ListBinding.embedView({
            slotId: list.id,
            model: list,
            viewInputs: {
              ...commonInputs,
              containerElement: 'div',
              rowElement: 'div',
              rowLayout: model.config.layout,
              itemToView: item => rowContent(item, model.config.isDynamic, h),
            },
          }),
        )
      }
    },
  })

const view = ApplicationComposition.makeView((model, h) => ({
  title: 'VirtualList browser fixture',
  body: h.div(
    [],
    [
      h.nav(
        [h.AriaLabel('Fixture controls'), h.Class('controls')],
        [
          h.button([h.OnClick(Message.ClickedJumpToIndex())], ['Index 120']),
          h.button([h.OnClick(Message.ClickedJumpToKey())], ['Key 180']),
          h.button([h.OnClick(Message.ClickedJumpToOffset())], ['Offset 2025']),
          h.button(
            [h.OnClick(Message.ClickedJumpToNegativeOffset())],
            ['Offset negative'],
          ),
          h.button(
            [h.OnClick(Message.ClickedJumpToHugeOffset())],
            ['Offset huge'],
          ),
          h.button(
            [h.OnClick(Message.ClickedJumpToNearestFirst())],
            ['Nearest first item'],
          ),
          h.button([h.OnClick(Message.ClickedJumpToEnd())], ['List end']),
          h.button(
            [h.OnClick(Message.ClickedExpandPreceding())],
            ['Expand preceding content'],
          ),
          h.button(
            [h.OnClick(Message.ClickedResizeViewport())],
            ['Shrink viewport'],
          ),
          h.button(
            [h.OnClick(Message.ClickedExpandPrecedingRow())],
            ['Expand preceding row'],
          ),
          h.button([h.OnClick(Message.ClickedAppendItem())], ['Append item']),
          h.button([h.OnClick(Message.ClickedUnmountList())], ['Unmount list']),
        ],
      ),
      h.output(
        [
          h.Id('status'),
          h.DataAttribute('item-count', String(model.items.length)),
          h.DataAttribute(
            'scroll-state',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list => list.pendingScroll._tag,
            }),
          ),
          h.DataAttribute(
            'scroll-top',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list => String(list.scrollTop),
            }),
          ),
          h.DataAttribute(
            'measured-height',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list =>
                list.measurement._tag === 'Measured'
                  ? String(list.measurement.containerHeight)
                  : 'unmeasured',
            }),
          ),
          h.DataAttribute(
            'measured-count',
            Option.match(model.maybeList, {
              onNone: () => '0',
              onSome: list =>
                String(Object.keys(list.measuredRowHeights).length),
            }),
          ),
          h.DataAttribute(
            'model',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list => JSON.stringify(list),
            }),
          ),
        ],
        [model.config.scrollMode, ' ', model.config.layout],
      ),
      h.main(
        [
          h.Id('main'),
          h.Class(`main ${model.config.scrollMode.toLowerCase()}`),
          h.Style(
            model.config.scrollMode === 'Ancestor'
              ? { height: `${model.containerHeight}px` }
              : {},
          ),
        ],
        [
          h.header(
            [
              h.Id('preceding'),
              h.Style({ height: `${model.precedingHeight}px` }),
            ],
            ['Content before the list'],
          ),
          virtualListView(model, h),
          h.footer([h.Id('following')], ['Content after the list']),
        ],
      ),
    ],
  ),
}))

const prepare = () =>
  ApplicationComposition.prepareBlock({ init, update, view })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
