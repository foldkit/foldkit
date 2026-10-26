import { Array, Effect, Layer, Option, Schema, Tuple } from 'effect'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { initAndSet } from './bindingInit.js'
import { runBindingInitRecipe } from './initRecipe.js'
import { commandInstances } from './instanceContext.js'
import { withOperationGraph } from './operationGraph.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { count: Schema.Number },
  CompletedAudit: { count: Schema.Number },
})
const ChildDefinition = Block.makeDefinition('SetChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = ChildDefinition.makeCommand('Read', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return ({ count }) => Effect.succeed(ChildMessage.CompletedRead({ count }))
  },
})
const Audit = ChildDefinition.makeCommand('Audit', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedAudit],
  handler: function* () {
    return ({ count }) => Effect.succeed(ChildMessage.CompletedAudit({ count }))
  },
})
const initialized = vi.fn<(count: number) => void>()
const ChildComposition = ChildDefinition.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => {
      initialized(count)
      return {
        model: { count },
        commands: [Read({ count }), Audit({ count })],
      }
    }),
    update: ChildComposition.makeUpdate({
      CompletedRead: model => ({ model }),
      CompletedAudit: model => ({ model }),
    }),
    EffectsLayer: Layer.mergeAll(Read.layer, Audit.layer),
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)

const Sibling = Schema.Struct({ label: Schema.String })
const Model = Schema.Struct({
  requiredChild: ChildBlock.Model,
  maybeChild: Schema.Option(ChildBlock.Model),
  projectedChild: ChildBlock.Model,
  sibling: Sibling,
})
const Message = defineMessageUnion({
  RequestedRequiredSet: { count: Schema.Number },
  RequestedOptionalSet: { count: Schema.Number },
  RequestedProjectedSet: { count: Schema.Number },
})
const ParentDefinition = Block.makeDefinition('SetParent', { Model, Message })
const RequiredBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'required',
  field: 'requiredChild',
  init: { contextToArgs: () => [0] },
})
const OptionalBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'optional',
  field: 'maybeChild',
  init: { contextToArgs: () => Option.none() },
})
const projected = vi.fn<(child: typeof ChildModel.Type) => void>()
const ProjectedBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'projected',
  read: model => Option.some(model.projectedChild),
  write: (model, nextChild) =>
    modifyFields(model, { projectedChild: () => nextChild }),
  init: {
    contextToArgs: () => [0],
    toParentFields: child => {
      projected(child)
      return { projectedChild: child }
    },
  },
})
const Composition = ParentDefinition.makeComposition({
  bindings: [RequiredBinding, OptionalBinding, ProjectedBinding],
})
const prepareParent = () =>
  Composition.prepareBlock({
    init: Composition.makeInit(() => ({
      model: { sibling: { label: 'initial' } },
    })),
    update: Composition.makeUpdate({
      RequestedRequiredSet: (model, { count }) =>
        initAndSet(RequiredBinding, model, { args: [count] }),
      RequestedOptionalSet: (model, { count }) =>
        initAndSet(OptionalBinding, model, { args: [count] }),
      RequestedProjectedSet: (model, { count }) =>
        initAndSet(ProjectedBinding, model, { args: [count] }),
    }),
    operations: {
      setRequired: (count: number) =>
        Tuple.make(Message.RequestedRequiredSet({ count })),
      setOptional: (count: number) =>
        Tuple.make(Message.RequestedOptionalSet({ count })),
      setProjected: (count: number) =>
        Tuple.make(Message.RequestedProjectedSet({ count })),
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParent
> = Block.assemble(prepareParent)

const DisabledStartupBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'disabledStartup',
  field: 'requiredChild',
  init: false,
})
const ParentOwnedOptionalBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'parentOwnedOptional',
  field: 'maybeChild',
})
const ParentOwnedComposition = ParentDefinition.makeComposition({
  bindings: [DisabledStartupBinding, ParentOwnedOptionalBinding],
})
const prepareParentOwned = () =>
  ParentOwnedComposition.prepareBlock({
    init: ParentOwnedComposition.makeInit(() => ({ model: makeModel() })),
    update: ParentOwnedComposition.makeUpdate({
      RequestedRequiredSet: (model, { count }) =>
        initAndSet(DisabledStartupBinding, model, { args: [count] }),
      RequestedOptionalSet: (model, { count }) =>
        initAndSet(ParentOwnedOptionalBinding, model, { args: [count] }),
      RequestedProjectedSet: model => ({ model }),
    }),
    operations: {
      setRequired: (count: number) =>
        Tuple.make(Message.RequestedRequiredSet({ count })),
      setOptional: (count: number) =>
        Tuple.make(Message.RequestedOptionalSet({ count })),
    },
  })
const ParentOwnedBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareParentOwned
> = Block.assemble(prepareParentOwned)

const makeModel = () =>
  Model.make({
    requiredChild: { count: 1 },
    maybeChild: Option.some({ count: 2 }),
    projectedChild: { count: 3 },
    sibling: { label: 'retained' },
  })

beforeEach(() => {
  initialized.mockClear()
  projected.mockClear()
})

describe('initAndSet', () => {
  it('constructs a passive recipe and defers child initialization and projection', () => {
    const recipe = initAndSet(ProjectedBinding, makeModel(), { args: [4] })
    expect(recipe).not.toBeTypeOf('function')
    expect(recipe).not.toHaveProperty('model')
    expect(recipe).not.toHaveProperty('commands')
    expect(initialized).not.toHaveBeenCalled()
    expect(projected).not.toHaveBeenCalled()
  })

  it('replaces a required child, preserves sibling fields, and retains child Command order and identity', () => {
    const model = makeModel()
    const next = ParentBlock.operations.setRequired(model, 4)

    expect(next.model).toEqual({
      ...model,
      requiredChild: { count: 4 },
    })
    expect(next.model.sibling).toBe(model.sibling)
    expect(next.model.maybeChild).toBe(model.maybeChild)
    expect(next.model.projectedChild).toBe(model.projectedChild)
    expect(Array.map(next.commands ?? [], command => command.name)).toEqual([
      'required/Read',
      'required/Audit',
    ])
    expect(
      Array.map(next.commands ?? [], command => commandInstances(command)),
    ).toEqual([
      [{ binding: RequiredBinding, isInitialization: true }],
      [{ binding: RequiredBinding, isInitialization: true }],
    ])
  })

  it('wraps a replacement for optional direct storage in Some', () => {
    const model = modifyFields(makeModel(), { maybeChild: () => Option.none() })
    const next = ParentBlock.operations.setOptional(model, 5)

    expect(next.model.maybeChild).toEqual(Option.some({ count: 5 }))
    expect(next.model.requiredChild).toBe(model.requiredChild)
    expect(next.model.projectedChild).toBe(model.projectedChild)
    expect(next.model.sibling).toBe(model.sibling)
  })

  it('sets direct fields whose startup values remain parent-owned', () => {
    const model = makeModel()
    const required = ParentOwnedBlock.operations.setRequired(model, 7)
    const optional = ParentOwnedBlock.operations.setOptional(model, 8)

    expect(required.model.requiredChild).toEqual({ count: 7 })
    expect(optional.model.maybeChild).toEqual(Option.some({ count: 8 }))
  })

  it('reuses the validated accessor projection to replace its selected child', () => {
    const model = makeModel()
    const next = ParentBlock.operations.setProjected(model, 6)

    expect(projected).toHaveBeenCalledExactlyOnceWith({ count: 6 })
    expect(next.model.projectedChild).toEqual({ count: 6 })
    expect(next.model.requiredChild).toBe(model.requiredChild)
    expect(next.model.maybeChild).toBe(model.maybeChild)
    expect(next.model.sibling).toBe(model.sibling)
  })

  it('snapshots arguments and config before the recipe runs', () => {
    const args: [number] = [4]
    const config = { args }
    const recipe = initAndSet(RequiredBinding, makeModel(), config)
    args.splice(0, 1, 99)
    config.args = Tuple.make(8)

    withOperationGraph([RequiredBinding], () => runBindingInitRecipe(recipe))

    expect(initialized).toHaveBeenCalledExactlyOnceWith(4)
  })

  it('rejects an unregistered graph before child initialization', () => {
    const recipe = initAndSet(RequiredBinding, makeModel(), { args: [4] })
    expect(() =>
      withOperationGraph([], () => runBindingInitRecipe(recipe)),
    ).toThrow('not registered in the current Block graph')
    expect(initialized).not.toHaveBeenCalled()
  })

  it.each([
    undefined,
    {},
    { args: 4 },
    { args: [4], key: 'child' },
    { args: [4], commands: Array.empty() },
    { args: [4], toParentModel: () => ({}) },
  ])(
    'rejects malformed erased config %j before child initialization',
    config => {
      expect(() =>
        Reflect.apply(initAndSet, undefined, [
          RequiredBinding,
          makeModel(),
          config,
        ]),
      ).toThrow()
      expect(initialized).not.toHaveBeenCalled()
    },
  )

  it.each([
    { requiredChild: { count: 1 } },
    { ...makeModel(), maybeChild: { count: 2 } },
    undefined,
  ])('rejects malformed parent Model %j before child initialization', model => {
    expect(() =>
      Reflect.apply(initAndSet, undefined, [
        RequiredBinding,
        model,
        { args: [4] },
      ]),
    ).toThrow('complete parent Model')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('rejects custom accessor Bindings without initialization metadata', () => {
    const noInit = ParentDefinition.makeBinding(ChildBlock, {
      placement: 'noInit',
      read: model => Option.some(model.requiredChild),
      write: (model, nextChild) =>
        modifyFields(model, { requiredChild: () => nextChild }),
    })
    expect(() =>
      Reflect.apply(initAndSet, undefined, [
        noInit,
        makeModel(),
        { args: [4] },
      ]),
    ).toThrow('requires singular child storage')
    expect(initialized).not.toHaveBeenCalled()
  })

  it('uses the native Binding guard when a projected field is not selected by its accessor', () => {
    const binding = ParentDefinition.makeBinding(ChildBlock, {
      placement: 'mismatchedProjection',
      read: model => Option.some(model.requiredChild),
      write: (model, nextChild) =>
        modifyFields(model, { requiredChild: () => nextChild }),
      init: {
        contextToArgs: () => [0],
        toParentFields: child => ({ projectedChild: child }),
      },
    })
    const recipe = initAndSet(binding, makeModel(), { args: [4] })

    expect(() =>
      withOperationGraph([binding], () => runBindingInitRecipe(recipe)),
    ).toThrow('must preserve the initialized child Model')
  })
})
