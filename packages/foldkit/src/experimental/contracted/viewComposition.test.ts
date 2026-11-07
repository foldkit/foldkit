import { Array, Effect, Record, Schema } from 'effect'
import { describe, expect, test } from 'vitest'

import { initAndInsert } from '../../block/bindingInit.js'
import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/index.js'
import * as Scene from '../../scene/public.js'

const CounterModel = Schema.Struct({ count: Schema.Number })
const CounterMessage = defineMessageUnion({ ClickedIncrement: {} })
const CounterKey = Symbol('ComposableViewCounter')
const CounterDefinition = Block.makeDefinition('ComposableViewCounter', {
  key: CounterKey,
  Model: CounterModel,
  Message: CounterMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const CounterComposition = CounterDefinition.makeComposition()
const CounterBlock = CounterDefinition.contract
const CounterImplementation = CounterDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: CounterComposition.makeInit(() => ({ model: { count: 0 } })),
    update: CounterComposition.makeUpdate({
      ClickedIncrement: CounterDefinition.makeFieldsStep(() => ({
        count: count => count + 1,
      })),
    }),
    view: CounterComposition.makeView((model, h) =>
      h.button(
        [h.OnClick(CounterMessage.ClickedIncrement())],
        [`Child: ${model.count}`],
      ),
    ),
  }),
)
const Model = Schema.Struct({
  count: Schema.Number,
  counter: CounterBlock.Model,
})
const Message = defineMessageUnion({ ClickedIncrement: {} })
const PageKey = Symbol('ComposableViewPage')
const PageDefinition = Block.makeDefinition('ComposableViewPage', {
  key: PageKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const CounterBinding = PageDefinition.makeRequiredFieldBinding(CounterBlock, {
  field: 'counter',
})
const PageComposition = PageDefinition.makeComposition({
  bindings: [CounterBinding],
})
const { makeFieldsStep } = PageDefinition
const init = PageComposition.makeInit(() => ({ model: { count: 0 } }))
const update = PageComposition.makeUpdate({
  ClickedIncrement: makeFieldsStep(() => ({ count: count => count + 1 })),
})
const counterView = PageComposition.makeView.withInputs<{ label: string }>(
  (model, { label }, h) =>
    h.div(
      [],
      [
        h.button(
          [h.OnClick(Message.ClickedIncrement())],
          [`${label}: ${model.count}`],
        ),
        h.block(
          CounterBinding.embedView({ slotId: 'counter', model: model.counter }),
        ),
      ],
    ),
)
const view = PageComposition.makeView((model, h) =>
  h.div([], [counterView(model, { label: 'Count' }, h)]),
)
const PageBlock = PageDefinition.makeBlock(
  Effect.gen(function* () {
    const counter = yield* CounterBinding

    return {
      children: [counter],
      init,
      update,
      view,
    }
  }),
).provide(CounterImplementation.layer)

const ForeignKey = Symbol('ForeignComposableView')
const ForeignDefinition = Block.makeDefinition('ForeignComposableView', {
  key: ForeignKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ForeignComposition = ForeignDefinition.makeComposition()
const foreignView = ForeignComposition.makeView((_model, h) => h.div([]))
const invalidView = PageComposition.makeView((model, h) => {
  Reflect.apply(foreignView, undefined, [model, h])

  return h.empty
})
const InvalidPageBlock = PageDefinition.makeBlock(
  Effect.gen(function* () {
    const counter = yield* CounterBinding

    return {
      children: [counter],
      init,
      update,
      view: invalidView,
    }
  }),
).provide(CounterImplementation.layer)

const failCompletionWithSubviewInputs = () =>
  // @ts-expect-error The primary view must retain the declared view inputs.
  PageDefinition.makeBlock(
    Effect.gen(function* () {
      const counter = yield* CounterBinding

      return {
        children: [counter],
        init,
        update,
        view: counterView,
      }
    }),
  )
void failCompletionWithSubviewInputs

describe('Composition view helpers', () => {
  test('composes an extracted helper with local inputs in the selected graph', async () => {
    await Effect.runPromise(
      Scene.scene(
        PageBlock,
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'Count: 0' })),
        Scene.expect(Scene.role('button', { name: 'Count: 1' })).toExist(),
        Scene.click(Scene.role('button', { name: 'Child: 0' })),
        Scene.expect(Scene.role('button', { name: 'Child: 1' })).toExist(),
      ),
    )
    await Effect.runPromise(
      Scene.scene(
        PageBlock,
        Scene.init(),
        Scene.expect(Scene.role('button', { name: 'Count: 0' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Child: 0' })).toExist(),
      ),
    )
  })

  test('rejects a helper authored by a different Composition', async () => {
    await expect(
      Effect.runPromise(Scene.scene(InvalidPageBlock, Scene.init())),
    ).rejects.toThrow(/another static Composition/)
  })
})

const ShellKey = Symbol('AlternateViewShell')
const ShellDefinition = Block.makeDefinition('AlternateViewShell', {
  key: ShellKey,
  Model: Schema.Struct({
    first: PageDefinition.contract.Model,
    second: PageDefinition.contract.Model,
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const FirstPageBinding = ShellDefinition.makeRequiredFieldBinding(
  PageDefinition.contract,
  {
    field: 'first',
  },
)
const SecondPageBinding = ShellDefinition.makeRequiredFieldBinding(
  PageDefinition.contract,
  {
    field: 'second',
  },
)
const ShellComposition = ShellDefinition.makeComposition({
  bindings: [FirstPageBinding, SecondPageBinding],
})
const shellInit = ShellComposition.makeInit(() => ({ model: {} }))
const shellUpdate = ShellComposition.makeUpdate({})
const shellView = ShellComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        FirstPageBinding.embedView({
          slotId: 'first',
          model: model.first,
          view: counterView,
          viewInputs: { label: 'First' },
        }),
      ),
      h.block(
        SecondPageBinding.embedView({
          slotId: 'second',
          model: model.second,
          view: counterView,
          viewInputs: { label: 'Second' },
        }),
      ),
    ],
  ),
)
const ShellBlock = ShellDefinition.makeBlock(
  Effect.gen(function* () {
    const first = yield* FirstPageBinding
    const second = yield* SecondPageBinding

    return {
      children: [first, second],
      init: shellInit,
      update: shellUpdate,
      view: shellView,
    }
  }),
).provide(PageBlock.layer)

const OtherPageComposition = PageDefinition.makeComposition()
const otherPageView = OtherPageComposition.makeView((_model, h) => h.div([]))
const wrongGraphView = ShellComposition.makeView((model, h) =>
  h.block(
    FirstPageBinding.embedView({
      slotId: 'first',
      model: model.first,
      view: otherPageView,
    }),
  ),
)
const WrongGraphBlock = ShellDefinition.makeBlock(
  Effect.gen(function* () {
    const first = yield* FirstPageBinding
    const second = yield* SecondPageBinding

    return {
      children: [first, second],
      init: shellInit,
      update: shellUpdate,
      view: wrongGraphView,
    }
  }),
).provide(PageBlock.layer)

const foreignEmbedding = {
  slotId: 'foreign',
  model: Model.make({ count: 0, counter: { count: 0 } }),
  view: foreignView,
}
const wrongInputEmbedding = {
  slotId: 'wrong-inputs',
  model: Model.make({ count: 0, counter: { count: 0 } }),
  view: counterView,
  viewInputs: { label: 1 },
}
const rejectForeignView = () => {
  // @ts-expect-error A view plan from another owner cannot replace this child's view.
  FirstPageBinding.embedView(foreignEmbedding)
}
const rejectWrongInputs = () => {
  // @ts-expect-error An alternate view keeps its exact local input contract.
  FirstPageBinding.embedView(wrongInputEmbedding)
}
void rejectForeignView
void rejectWrongInputs

describe('alternate constructed child views', () => {
  test('uses the selected child graph with separate occurrence routing', async () => {
    await Effect.runPromise(
      Scene.scene(
        ShellBlock,
        Scene.init(),
        Scene.click(Scene.role('button', { name: 'First: 0' })),
        Scene.expect(Scene.role('button', { name: 'First: 1' })).toExist(),
        Scene.expect(Scene.role('button', { name: 'Second: 0' })).toExist(),
        Scene.click(Scene.role('button', { name: 'Second: 0' })),
        Scene.expect(Scene.role('button', { name: 'Second: 1' })).toExist(),
      ),
    )
  })

  test('rejects an alternate plan from another private Composition', async () => {
    await expect(
      Effect.runPromise(Scene.scene(WrongGraphBlock, Scene.init())),
    ).rejects.toThrow(/another static Composition/)
  })
})

const ViewlessKey = Symbol('ViewlessAlternateCounter')
const ViewlessDefinition = Block.makeDefinition('ViewlessAlternateCounter', {
  key: ViewlessKey,
  Model: CounterModel,
  Message: CounterMessage,
  InitArgs: Schema.Tuple([]),
})
const ViewlessComposition = ViewlessDefinition.makeComposition()
const ViewlessImplementation = ViewlessDefinition.makeBlock(
  Effect.succeed({
    children: [],
    init: ViewlessComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ViewlessComposition.makeUpdate({
      ClickedIncrement: ViewlessDefinition.makeFieldsStep(() => ({
        count: count => count + 1,
      })),
    }),
  }),
)
const alternateCounterView = ViewlessComposition.makeView.withInputs<{
  label: string
}>((model, { label }, h) =>
  h.button(
    [h.OnClick(CounterMessage.ClickedIncrement())],
    [`${label}: ${model.count}`],
  ),
)
const ViewlessShellKey = Symbol('ViewlessAlternateShell')
const ViewlessShellDefinition = Block.makeDefinition('ViewlessAlternateShell', {
  key: ViewlessShellKey,
  Model: Schema.Struct({ child: ViewlessDefinition.contract.Model }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const ViewlessBinding = ViewlessShellDefinition.makeRequiredFieldBinding(
  ViewlessDefinition.contract,
  { field: 'child' },
)
const ViewlessShellComposition = ViewlessShellDefinition.makeComposition({
  bindings: [ViewlessBinding],
})
const ViewlessShellBlock = ViewlessShellDefinition.makeBlock(
  Effect.gen(function* () {
    const child = yield* ViewlessBinding

    return {
      children: [child],
      init: ViewlessShellComposition.makeInit(() => ({ model: {} })),
      update: ViewlessShellComposition.makeUpdate({}),
      view: ViewlessShellComposition.makeView((model, h) =>
        h.block(
          ViewlessBinding.embedView({
            slotId: 'viewless',
            model: model.child,
            view: alternateCounterView,
            viewInputs: { label: 'Explicit' },
          }),
        ),
      ),
    }
  }),
).provide(ViewlessImplementation.layer)

test('embeds an explicit authored view when the child has no default view', async () => {
  await Effect.runPromise(
    Scene.scene(
      ViewlessShellBlock,
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'Explicit: 0' })),
      Scene.expect(Scene.role('button', { name: 'Explicit: 1' })).toExist(),
    ),
  )
})

const KeyedShellKey = Symbol('KeyedAlternateShell')
const KeyedShellDefinition = Block.makeDefinition('KeyedAlternateShell', {
  key: KeyedShellKey,
  Model: Schema.Struct({
    children: Schema.Record(Schema.String, ViewlessDefinition.contract.Model),
  }),
  Message: Schema.Never,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const KeyedChildBinding = KeyedShellDefinition.makeRecordBinding(
  ViewlessDefinition.contract,
  { field: 'children' },
)
const KeyedShellComposition = KeyedShellDefinition.makeComposition({
  bindings: [KeyedChildBinding],
})
const insertFirst = KeyedShellDefinition.makeStep(model =>
  initAndInsert(KeyedChildBinding, model, { key: 'first', args: [] }),
)
const KeyedShellBlock = KeyedShellDefinition.makeBlock(
  Effect.gen(function* () {
    const children = yield* KeyedChildBinding

    return {
      children: [children],
      init: KeyedShellComposition.makeInit(() => ({
        model: { children: {} },
        steps: [insertFirst],
      })),
      update: KeyedShellComposition.makeUpdate({}),
      view: KeyedShellComposition.makeView((model, h) =>
        h.div(
          [],
          Array.map(Record.toEntries(model.children), ([key, child]) =>
            h.block(
              KeyedChildBinding.embedView({
                slotId: key,
                key,
                model: child,
                view: alternateCounterView,
                viewInputs: { label: key },
              }),
            ),
          ),
        ),
      ),
    }
  }),
).provide(ViewlessImplementation.layer)

test('embeds a keyed alternate view with the native key and graph contracts', async () => {
  await Effect.runPromise(
    Scene.scene(
      KeyedShellBlock,
      Scene.init(),
      Scene.click(Scene.role('button', { name: 'first: 0' })),
      Scene.expect(Scene.role('button', { name: 'first: 1' })).toExist(),
    ),
  )
})
