import { Effect, Schema } from 'effect'
import { describe, expect, test, vi } from 'vitest'

import * as Block from '../../block/public.js'
import * as Html from '../../html/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Scene from '../../scene/public.js'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({ ClickedIncrement: {} })

describe('constructed view builder reuse', () => {
  test('retains lazy results when an ordinary view passes its builder', async () => {
    const PageKey = Symbol('LazyBuilderPage')
    const PageDefinition = Block.makeDefinition('LazyBuilderPage', {
      key: PageKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Element' },
    })
    const PageComposition = PageDefinition.makeComposition()
    const lazyLabel = Html.createLazy()
    const labelView = vi.fn(
      (label: string, h: Block.ViewBuilderFor<typeof PageComposition>) =>
        h.span([], [label]),
    )
    const PageBlock = PageDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: PageComposition.makeInit(() => ({ model: { count: 0 } })),
        update: PageComposition.makeUpdate({
          ClickedIncrement: PageDefinition.makeFieldsStep(() => ({
            count: count => count + 1,
          })),
        }),
        view: PageComposition.makeView((model, h) =>
          h.div(
            [],
            [
              h.button(
                [h.OnClick(Message.ClickedIncrement())],
                [`Count: ${model.count}`],
              ),
              lazyLabel(labelView, ['Memoized', h]),
            ],
          ),
        ),
      }),
    )

    await Effect.runPromise(
      Scene.scene(
        PageBlock,
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'Count: 0' })),
        Scene.click(Scene.role('button', { name: 'Count: 1' })),
        Scene.expect(Scene.role('button', { name: 'Count: 2' })).toExist(),
      ),
    )

    expect(labelView).toHaveBeenCalledTimes(1)
  })

  test('shares the stable builder with an extracted input-bearing view', async () => {
    const PageKey = Symbol('LazyBuilderInputsPage')
    const PageDefinition = Block.makeDefinition('LazyBuilderInputsPage', {
      key: PageKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Element' },
    })
    const PageComposition = PageDefinition.makeComposition()
    const builders = new Set<object>()
    const lazyLabel = Html.createLazy()
    const labelView = vi.fn(
      (label: string, h: Block.ViewBuilderFor<typeof PageComposition>) =>
        h.span([], [label]),
    )
    const label = PageComposition.makeView.withInputs<{ text: string }>(
      (_model, { text }, h) => {
        builders.add(h)

        return lazyLabel(labelView, [text, h])
      },
    )
    const PageBlock = PageDefinition.makeBlock(
      Effect.succeed({
        children: [],
        init: PageComposition.makeInit(() => ({ model: { count: 0 } })),
        update: PageComposition.makeUpdate({
          ClickedIncrement: PageDefinition.makeFieldsStep(() => ({
            count: count => count + 1,
          })),
        }),
        view: PageComposition.makeView((model, h) => {
          builders.add(h)

          return h.div(
            [],
            [
              h.button(
                [h.OnClick(Message.ClickedIncrement())],
                [`Count: ${model.count}`],
              ),
              label(model, { text: 'Memoized' }, h),
            ],
          )
        }),
      }),
    )

    await Effect.runPromise(
      Scene.scene(
        PageBlock,
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'Count: 0' })),
        Scene.click(Scene.role('button', { name: 'Count: 1' })),
        Scene.expect(Scene.role('button', { name: 'Count: 2' })).toExist(),
      ),
    )

    expect(builders.size).toBe(1)
    expect(labelView).toHaveBeenCalledTimes(1)
  })

  test('keeps adapters isolated between acquisitions with different child implementations', async () => {
    const ChildKey = Symbol('LazyBuilderChild')
    const ChildDefinition = Block.makeDefinition('LazyBuilderChild', {
      key: ChildKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Element' },
    })
    const ChildComposition = ChildDefinition.makeComposition()
    const makeChild = (label: string) =>
      ChildDefinition.makeBlock(
        Effect.succeed({
          children: [],
          init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
          update: ChildComposition.makeUpdate({
            ClickedIncrement: ChildDefinition.makeFieldsStep(() => ({
              count: count => count + 1,
            })),
          }),
          view: ChildComposition.makeView((model, h) =>
            h.button(
              [h.OnClick(Message.ClickedIncrement())],
              [`${label}: ${model.count}`],
            ),
          ),
        }),
      )
    const FirstChild = makeChild('First')
    const SecondChild = makeChild('Second')
    const PageKey = Symbol('LazyBuilderParent')
    const PageDefinition = Block.makeDefinition('LazyBuilderParent', {
      key: PageKey,
      Model: Schema.Struct({ child: ChildDefinition.contract.Model }),
      Message: Schema.Never,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Element' },
    })
    const ChildBinding = PageDefinition.makeRequiredFieldBinding(
      ChildDefinition.contract,
      {
        field: 'child',
      },
    )
    const PageComposition = PageDefinition.makeComposition({
      bindings: [ChildBinding],
    })
    const builders = new Set<object>()
    const PageBlock = PageDefinition.makeBlock(
      Effect.gen(function* () {
        const child = yield* ChildBinding

        return {
          children: [child],
          init: PageComposition.makeInit(() => ({ model: {} })),
          update: PageComposition.makeUpdate({}),
          view: PageComposition.makeView((model, h) => {
            builders.add(h)

            return h.block(
              ChildBinding.embedView({ slotId: 'child', model: model.child }),
            )
          }),
        }
      }),
    )

    await Effect.runPromise(
      Scene.scene(
        PageBlock.provide(FirstChild.layer),
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'First: 0' })),
        Scene.expect(Scene.role('button', { name: 'First: 1' })).toExist(),
      ),
    )
    await Effect.runPromise(
      Scene.scene(
        PageBlock.provide(SecondChild.layer),
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'Second: 0' })),
        Scene.expect(Scene.role('button', { name: 'Second: 1' })).toExist(),
      ),
    )

    expect(builders.size).toBe(2)
  })
})
