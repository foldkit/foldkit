import { Context, Layer, Schema } from 'effect'
import { afterEach, expect, it } from 'vitest'

import type { RequirementsOfBindings } from '../block/binding.js'
import { makeDefinition } from '../block/define.js'
import {
  type ActiveInstance,
  CurrentInstance,
} from '../block/instanceContext.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import { beginRender, createBoundaryRegistry } from './boundary.js'
import { __htmlBuilder } from './index.js'
import { clearRuntime, setRuntime } from './runtimeSingleton.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  ClickedIncrement: {},
  BlurredButton: {},
})
const ChildDefinition = makeDefinition('OriginViewChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      ClickedIncrement: model => ({ model }),
      BlurredButton: model => ({ model }),
    }),
    view: ChildComposition.makeView((_model, h) =>
      h.button([
        h.OnClick(ChildMessage.ClickedIncrement()),
        h.OnBlur(ChildMessage.BlurredButton()),
      ]),
    ),
    EffectsLayer: Layer.empty,
  })
const ChildBlock: Block.FromAssemblyWithView<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({ child: ChildModel })
const ParentMessage = defineMessageUnion({ ClickedParent: {} })
const ParentDefinition = makeDefinition('OriginViewParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
const parentView = ParentComposition.makeView((model, h) =>
  h.block(ChildBinding.embedView({ slotId: 'child', model: model.child })),
)
const parentHtml = __htmlBuilder<
  typeof ParentComposition.Message.Type,
  RequirementsOfBindings<[typeof ChildBinding]>
>()

const makeInstance = (
  generation: number,
  binding?: object,
): ActiveInstance => ({
  isActive: true,
  generation,
  ...(binding === undefined ? {} : { binding }),
  resources: Context.empty(),
  mounts: new Set(),
  children: new Map(),
})

afterEach(() => {
  clearRuntime()
})

it('stamps a view emission with its rendered occurrence and drops it after replacement', () => {
  const dispatched: Array<unknown> = []
  const oldChild = makeInstance(4, ChildBinding)
  const root = makeInstance(0)
  root.children.set(ChildBinding, new Map([[undefined, oldChild]]))
  const context = Context.add(Context.empty(), CurrentInstance, { node: root })
  const registry = createBoundaryRegistry()
  setRuntime(message => dispatched.push(message), context, registry)
  beginRender(registry)

  const oldVNode = parentView({ child: { count: 1 } }, parentHtml)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const clickOld = oldVNode?.data?.on?.click as () => void
  clickOld()
  expect(dispatched).toEqual([
    {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 4,
      message: ChildMessage.ClickedIncrement(),
    },
  ])

  oldChild.isActive = false
  const replacement = makeInstance(9, ChildBinding)
  root.children.set(ChildBinding, new Map([[undefined, replacement]]))
  clickOld()
  expect(dispatched).toHaveLength(1)

  beginRender(registry)
  const replacementVNode = parentView({ child: { count: 2 } }, parentHtml)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const clickReplacement = replacementVNode?.data?.on?.click as () => void
  clickReplacement()
  expect(dispatched).toHaveLength(2)
  expect(dispatched).toContainEqual({
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 9,
    message: ChildMessage.ClickedIncrement(),
  })
})

it('drops cleanup blur from an unmounted view while its Model occurrence remains active', () => {
  const dispatched: Array<unknown> = []
  const child = makeInstance(4, ChildBinding)
  const root = makeInstance(0)
  root.children.set(ChildBinding, new Map([[undefined, child]]))
  const context = Context.add(Context.empty(), CurrentInstance, { node: root })
  const registry = createBoundaryRegistry()
  setRuntime(message => dispatched.push(message), context, registry)
  beginRender(registry)

  const oldVNode = parentView({ child: { count: 1 } }, parentHtml)
  if (oldVNode === null) {
    throw new Error('Expected the child view to return a VNode.')
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const blurOld = oldVNode.data?.on?.blur as (event: FocusEvent) => void
  oldVNode.data?.hook?.destroy?.(oldVNode)
  oldVNode.data?.hook?.postdestroy?.(oldVNode)

  expect(child.isActive).toBe(true)
  expect(() => blurOld(new FocusEvent('blur'))).not.toThrow()
  expect(dispatched).toEqual([])

  beginRender(registry)
  const currentVNode = parentView({ child: { count: 1 } }, parentHtml)
  if (currentVNode === null) {
    throw new Error('Expected the child view to return a VNode.')
  }
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const blurCurrent = currentVNode.data?.on?.blur as (event: FocusEvent) => void

  blurOld(new FocusEvent('blur'))
  blurCurrent(new FocusEvent('blur'))

  expect(dispatched).toEqual([
    {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 4,
      message: ChildMessage.BlurredButton(),
    },
  ])
})

it('rejects a live generated view emission without a runtime occurrence', () => {
  const registry = createBoundaryRegistry()
  setRuntime(() => {}, Context.empty(), registry)
  beginRender(registry)

  const vnode = parentView({ child: { count: 1 } }, parentHtml)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const click = vnode?.data?.on?.click as () => void

  expect(click).toThrow('could not be lifted into its parent')
})

it('uses the generated synthetic origin for a replay without a runtime occurrence', () => {
  const dispatched: Array<unknown> = []
  const registry = createBoundaryRegistry()
  setRuntime(
    message => dispatched.push(message),
    Context.empty(),
    registry,
    'Replay',
  )
  beginRender(registry)

  const vnode = parentView({ child: { count: 1 } }, parentHtml)
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const click = vnode?.data?.on?.click as () => void
  click()

  expect(dispatched).toEqual([
    {
      _tag: 'GotChildMessage',
      placement: 'child',
      generation: 0,
      message: ChildMessage.ClickedIncrement(),
    },
  ])
})
