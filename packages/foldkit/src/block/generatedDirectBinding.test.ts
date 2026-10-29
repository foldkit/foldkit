import { Array, Option, Predicate, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const SearchModel = Schema.Struct({ count: Schema.Number })
type SearchModel = typeof SearchModel.Type
const SearchMessage = defineMessageUnion({
  ClickedIncrement: {},
  CompletedScheduleIncrement: {},
})
type SearchMessage = typeof SearchMessage.Type
const SearchOutMessage = defineMessageUnion({ Incremented: {} })
type SearchOutMessage = typeof SearchOutMessage.Type
const SearchDefinition = makeDefinition('GeneratedDirectSearch', {
  Model: SearchModel,
  Message: SearchMessage,
  OutMessage: SearchOutMessage,
})
const ScheduleIncrement = SearchDefinition.makeCommand('ScheduleIncrement', {
  messages: [SearchMessage.CompletedScheduleIncrement],
})
const SearchComposition = SearchDefinition.makeComposition()
const prepareSearchBlock = () =>
  SearchComposition.prepareBlock({
    init: SearchComposition.makeInit(() => ({
      model: { count: 0 },
      commands: [ScheduleIncrement()],
    })),
    update: SearchComposition.makeUpdate({
      ClickedIncrement: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
        outMessage: SearchOutMessage.Incremented(),
      }),
      CompletedScheduleIncrement: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
    }),
    view: SearchComposition.makeView((_model, h) => h.div([])),
    hostHandlers: [ScheduleIncrement],
  })
const SearchBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof SearchModel,
  typeof prepareSearchBlock
> = Block.assemble(prepareSearchBlock)

const ParentModel = Schema.Struct({ search: SearchModel, label: Schema.String })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({ ClickedParent: {} })
type ParentMessage = typeof ParentMessage.Type
const ParentDefinition = makeDefinition('GeneratedDirectParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const foldSearchOutMessage = SearchOutMessage.match<
  Update.Step<ParentModel, ParentMessage>
>({
  Incremented: () => ParentDefinition.makeNoopStep(),
})
const SearchBinding = ParentDefinition.makeBinding(SearchBlock, {
  field: 'search',
}).withOutMessagePolicy({ fold: foldSearchOutMessage })
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [SearchBinding],
})
const update = ParentComposition.makeUpdate({
  ClickedParent: model => ({ model }),
})
const init = ParentComposition.makeInit(() => ({ model: { label: 'Parent' } }))

const ContextualSearchDefinition = makeDefinition(
  'GeneratedDirectContextualSearch',
  {
    Model: SearchModel,
    Message: SearchMessage,
  },
)
const ContextualSearchComposition = ContextualSearchDefinition.makeComposition()
const prepareContextualSearchBlock = () =>
  ContextualSearchComposition.prepareBlock({
    init: ContextualSearchComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ContextualSearchComposition.makeUpdate.withContext(
      (_source: string) => ({
        ClickedIncrement: model => ({ model }),
        CompletedScheduleIncrement: model => ({ model }),
      }),
    ),
    view: ContextualSearchComposition.makeView((_model, h) => h.div([])),
  })
const ContextualSearchBlock: Block.FromAssemblyWithView<
  typeof SearchModel,
  typeof prepareContextualSearchBlock
> = Block.assemble(prepareContextualSearchBlock)

if (false) {
  ParentDefinition.makeBinding(ContextualSearchBlock, {
    // @ts-expect-error Required update context needs an explicit bidirectional mapping.
    field: 'search',
  })
}

it('derives and routes a direct child envelope without an authored wrapper', () => {
  const initialModel = ParentModel.make({
    search: { count: 1 },
    label: 'Parent',
  })
  const embeddedSearch = SearchBinding.embedView({
    slotId: 'search',
    model: initialModel.search,
  })

  const message = embeddedSearch.toParentMessage(
    SearchMessage.ClickedIncrement(),
  )
  const result = update(initialModel, message)
  const initialized = init()

  expect(message).toEqual({
    _tag: 'GotSearchMessage',
    placement: 'search',
    generation: 0,
    message: SearchMessage.ClickedIncrement(),
  })
  expect(Schema.is(ParentComposition.Message)(message)).toBe(true)
  expect(result.model).toEqual({ search: { count: 2 }, label: 'Parent' })
  expect(result.commands).toEqual([])
  expect(initialized.model).toEqual({ search: { count: 0 }, label: 'Parent' })
  expect(initialized.commands).toHaveLength(1)
  const initializedCommand = Option.getOrThrow(
    Array.head(initialized.commands ?? []),
  )
  const messageMappers = Reflect.get(initializedCommand, 'messageMappers')
  expect(globalThis.Array.isArray(messageMappers)).toBe(true)
  const messageMapper = Option.getOrThrow(
    Array.head(globalThis.Array.isArray(messageMappers) ? messageMappers : []),
  )
  if (!Predicate.isFunction(messageMapper)) {
    throw new Error('Expected the initialized child Command message mapper.')
  }
  const initializedMessage = Reflect.apply(messageMapper, undefined, [
    SearchMessage.CompletedScheduleIncrement(),
  ])
  expect(initializedMessage).toEqual({
    _tag: 'GotSearchMessage',
    placement: 'search',
    generation: 0,
    message: SearchMessage.CompletedScheduleIncrement(),
  })
  expectTypeOf(message).toEqualTypeOf<
    Readonly<{
      _tag: 'GotSearchMessage'
      placement: 'search'
      generation: number
      message: typeof SearchMessage.Type
    }>
  >()
  // @ts-expect-error The authored parent Message remains local-only.
  ParentMessage.GotSearchMessage
})
