import { Array, Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { type HtmlBuilder, childAttributes } from 'foldkit/html'
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
type RowContent = typeof RowContent.Type
const Item = Schema.Struct({
  id: Schema.String,
  index: Schema.Number,
  content: RowContent,
})
type Item = typeof Item.Type
const ItemVirtualList = VirtualList.makeBlock<Item>()
const Model = Schema.Struct({
  config: FixtureConfig,
  maybeList: Schema.Option(ItemVirtualList),
  items: Schema.Array(Item),
  precedingHeight: Schema.Number,
  containerHeight: Schema.Number,
})
type Model = typeof Model.Type
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
type Message = typeof Message.Type

export class Application extends Block<
  Application,
  Readonly<{ flags: FixtureConfig }>
>()('Application', { Model, Message }) {}

type ApplicationViewBuilder = HtmlBuilder<Message>

const scrollContainerFor = (config: FixtureConfig) => {
  if (config.scrollMode === 'Self') {
    return VirtualList.ScrollContainer.Self()
  } else if (config.scrollMode === 'Ancestor') {
    return VirtualList.ScrollContainer.Ancestor({ selector: '#main' })
  } else {
    return VirtualList.ScrollContainer.Window()
  }
}

const sendToList =
  (listMessage: typeof ItemVirtualList.Message.Type) => (model: Model) => ({
    model,
    messages: Option.match(model.maybeList, {
      onNone: () => [],
      onSome: list => [list.send(listMessage)],
    }),
  })

const rowContent = (
  item: Item,
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

const virtualListView = (model: Model, h: ApplicationViewBuilder) =>
  Option.match(model.maybeList, {
    onNone: () => h.p([h.Id('unmounted')], ['List unmounted']),
    onSome: list => {
      const rowInputs: VirtualList.RowHeightInputs<Item> = model.config
        .isDynamic
        ? {
            dynamicRowHeights: true,
            itemToEstimatedRowHeightPx: () => ROW_HEIGHT_PX,
          }
        : {}
      const commonInputs = {
        ...rowInputs,
        items: model.items,
        itemToKey: (item: Item) => item.id,
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
            list.view({
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
            }),
          ],
        )
      } else {
        return list.view({
          ...commonInputs,
          containerElement: 'div',
          rowElement: 'div',
          rowLayout: model.config.layout,
          itemToView: item => rowContent(item, model.config.isDynamic, h),
        })
      }
    },
  })

const view = (model: Model, h: ApplicationViewBuilder) => ({
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
              onSome: list => list.model.pendingScroll._tag,
            }),
          ),
          h.DataAttribute(
            'scroll-top',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list => String(list.model.scrollTop),
            }),
          ),
          h.DataAttribute(
            'measured-height',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list =>
                list.model.measurement._tag === 'Measured'
                  ? String(list.model.measurement.containerHeight)
                  : 'unmeasured',
            }),
          ),
          h.DataAttribute(
            'measured-count',
            Option.match(model.maybeList, {
              onNone: () => '0',
              onSome: list =>
                String(Object.keys(list.model.measuredRowHeights).length),
            }),
          ),
          h.DataAttribute(
            'model',
            Option.match(model.maybeList, {
              onNone: () => 'unmounted',
              onSome: list => JSON.stringify(list.model),
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
})

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const list = yield* new ItemVirtualList('list', {
      id: 'virtual-list',
      rowHeightPx: ROW_HEIGHT_PX,
      scrollContainer: scrollContainerFor(flags),
    })

    return {
      model: {
        config: flags,
        maybeList: Option.some(list),
        items: Array.makeBy(
          flags.isShort ? SHORT_ROW_COUNT : ROW_COUNT,
          index => ({
            id: `item-${index}`,
            index,
            content: RowContent.Compact(),
          }),
        ),
        precedingHeight: 800,
        containerHeight: 420,
      },

      update: {
        ClickedJumpToIndex: sendToList(
          VirtualList.requestScrollToIndex(120, { alignment: 'Start' }),
        ),
        ClickedJumpToKey: sendToList(
          VirtualList.requestScrollToKey('item-180', { alignment: 'Center' }),
        ),
        ClickedJumpToOffset: sendToList(
          VirtualList.requestScrollToOffset(2_025),
        ),
        ClickedJumpToNegativeOffset: sendToList(
          VirtualList.requestScrollToOffset(-100),
        ),
        ClickedJumpToHugeOffset: sendToList(
          VirtualList.requestScrollToOffset(1_000_000),
        ),
        ClickedJumpToNearestFirst: sendToList(
          VirtualList.requestScrollToIndex(0, { alignment: 'Nearest' }),
        ),
        ClickedJumpToEnd: sendToList(VirtualList.requestScrollToEnd()),
        ClickedExpandPreceding: model => ({
          model: modifyFields(model, {
            precedingHeight: height => height + 160,
          }),
        }),
        ClickedResizeViewport: model => ({
          model: modifyFields(model, {
            containerHeight: height => height - 80,
          }),
        }),
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
            list.model.viewportAnchor._tag === 'Row'
              ? Option.some(Math.max(0, list.model.viewportAnchor.index - 1))
              : Option.none(),
          )

          return {
            model: modifyFields(model, {
              items: Array.map(item =>
                Option.contains(maybePrecedingIndex, item.index)
                  ? modifyFields(item, {
                      content: () => RowContent.Expanded(),
                    })
                  : item,
              ),
            }),
          }
        },
        ClickedAppendItem: model => {
          const nextItems = Array.append(model.items, {
            id: `item-${model.items.length}`,
            index: model.items.length,
            content: RowContent.Compact(),
          })

          return sendToList(
            VirtualList.informItemsChanged(
              Array.map(nextItems, item => item.id),
            ),
          )(modifyFields(model, { items: () => nextItems }))
        },
        ClickedUnmountList: model => ({
          model: modifyFields(model, { maybeList: () => Option.none() }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(ItemVirtualList.Live))
