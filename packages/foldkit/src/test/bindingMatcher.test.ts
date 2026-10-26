import { Effect, Option, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { qualifyCommand } from '../block/scope.js'
import * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { __bindCommandMatcher } from './bindingMatcher.js'
import type { AnyCommand, BaseInternal } from './internal.js'
import { resolveAllInternal } from './internal.js'

const Message = defineMessageUnion({
  CompletedWork: { value: Schema.String },
})
type Message = typeof Message.Type

const ChildDefinition = makeDefinition('BindingMatcherChild', {
  Model: Schema.Struct({}),
  Message,
})

const Work = ChildDefinition.makeCommand('Work', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
    generation: Schema.Number,
  },
  messages: [Message.CompletedWork],
  handler: function* () {
    return ({ entryId }) =>
      Effect.succeed(Message.CompletedWork({ value: entryId }))
  },
})

const OtherWork = Command.define('Work', {
  args: {
    entryId: Schema.String,
    version: Schema.Number,
    generation: Schema.Number,
  },
  messages: [Message.CompletedWork],
})

const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: () => ({ model: {} }),
    update: ChildComposition.makeUpdate({
      CompletedWork: model => ({ model }),
    }),
    EffectsLayer: Work.layer,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildComposition.Model,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentDefinition = makeDefinition('BindingMatcherParent', {
  Model: Schema.Struct({}),
  Message: Schema.Never,
})

const LeftBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'Left',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
})

const RightBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'Right',
  read: model => Option.some(model),
  write: (_model, nextChild) => nextChild,
})

const args = { entryId: 'toast-entry-0', version: 2, generation: 3 }

const scope = (
  binding: typeof LeftBinding | typeof RightBinding,
  command: ReturnType<typeof Work>,
  key?: string,
) =>
  qualifyCommand(binding.placement, command, ChildBlock.owner, {
    binding,
    ...(key === undefined ? {} : { key }),
  })

const scopeOtherWork = (
  binding: typeof LeftBinding | typeof RightBinding,
  command: ReturnType<typeof OtherWork>,
  key?: string,
) =>
  qualifyCommand(binding.placement, command, ChildBlock.owner, {
    binding,
    ...(key === undefined ? {} : { key }),
  })

const simulation = (
  commands: ReadonlyArray<AnyCommand>,
): BaseInternal<ReadonlyArray<string>, Message> => ({
  model: [],
  message: undefined,
  commands,
  outMessage: undefined,
  updateFn: (model, message) => ({
    model: [...model, message.value],
  }),
  resolvers: [],
})

describe('__bindCommandMatcher', () => {
  it('matches source, Binding object, keyed occurrence, and full args together', () => {
    const matcher = __bindCommandMatcher(
      ChildBlock,
      LeftBinding,
      Work(args),
      'selected',
    )
    const wrongSource = scopeOtherWork(LeftBinding, OtherWork(args), 'selected')
    const wrongBinding = scope(RightBinding, Work(args), 'selected')
    const wrongVersion = scope(
      LeftBinding,
      Work({ ...args, version: 1 }),
      'selected',
    )
    const wrongGeneration = scope(
      LeftBinding,
      Work({ ...args, generation: 2 }),
      'selected',
    )
    const wrongKey = scope(LeftBinding, Work(args), 'other')
    const matching = scope(LeftBinding, Work(args), 'selected')
    const result = resolveAllInternal(
      simulation([
        wrongSource,
        wrongBinding,
        wrongVersion,
        wrongGeneration,
        wrongKey,
        matching,
      ]),
      [[matcher, Message.CompletedWork({ value: 'matched' })]],
    )

    expect(result.model).toEqual(['matched'])
    expect(result.commands).toEqual([
      wrongSource,
      wrongBinding,
      wrongVersion,
      wrongGeneration,
      wrongKey,
    ])
  })

  it('keeps resolver cache entries distinct by Binding path', () => {
    const leftMatcher = __bindCommandMatcher(
      ChildBlock,
      LeftBinding,
      Work(args),
    )
    const rightMatcher = __bindCommandMatcher(
      ChildBlock,
      RightBinding,
      Work(args),
    )
    const withLeftResolver = resolveAllInternal(simulation([]), [
      [leftMatcher, Message.CompletedWork({ value: 'left' })],
    ])
    const result = resolveAllInternal(
      {
        ...withLeftResolver,
        commands: [
          scope(LeftBinding, Work(args)),
          scope(RightBinding, Work(args)),
        ],
      },
      [[rightMatcher, Message.CompletedWork({ value: 'right' })]],
    )

    expect(result.model).toEqual(['left', 'right'])
    expect(result.commands).toEqual([])
  })

  it('rejects an unresolved ancestor occurrence instead of consuming the first', () => {
    const innerMatcher = __bindCommandMatcher(
      ChildBlock,
      LeftBinding,
      Work(args),
    )
    const innerCommand = scope(LeftBinding, Work(args))
    const first = qualifyCommand('Ancestor', innerCommand, undefined, {
      binding: RightBinding,
      key: 'first',
    })
    const second = qualifyCommand('Ancestor', innerCommand, undefined, {
      binding: RightBinding,
      key: 'second',
    })

    expect(() =>
      resolveAllInternal(simulation([first, second]), [
        [innerMatcher, Message.CompletedWork({ value: 'unexpected' })],
      ]),
    ).toThrow('multiple pending Commands match')
  })

  it('rejects a Binding from another completed Block instance', () => {
    const OtherComposition = ChildDefinition.makeComposition()
    const prepareOtherBlock = () =>
      OtherComposition.prepareBlock({
        init: () => ({ model: {} }),
        update: OtherComposition.makeUpdate({
          CompletedWork: model => ({ model }),
        }),
        EffectsLayer: Work.layer,
      })
    const OtherBlock: Block.FromAssemblyWithoutViewOrOutMessage<
      typeof OtherComposition.Model,
      typeof prepareOtherBlock
    > = Block.assemble(prepareOtherBlock)

    expect(() =>
      __bindCommandMatcher(OtherBlock, LeftBinding, Work(args)),
    ).toThrow('belongs to a different completed Block instance')
  })
})
