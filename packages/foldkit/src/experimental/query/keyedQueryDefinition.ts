import { Schema } from 'effect'

import { makeFamilyDeclaration } from '../contracted/familyLayer.js'
import type { KeyedQueryConfig, SyncFields } from './keyedQueryContract.js'
import {
  makeKeyedQueryAccessors,
  makeKeyedQueryArgumentOperations,
  makeKeyedQueryFetchApi,
  makeKeyedQueryInMessage,
  makeKeyedQueryLocalMessage,
  makeKeyedQueryModel,
  makeKeyedQueryOutMessage,
} from './keyedQueryContract.js'

/** @internal Canonical identity shared by checked KeyedQuery specializations. */
export const KeyedQueryKey = Symbol('KeyedQueryFamily')

/** @internal Declares notifying keyed contracts and the original Fetch definition. */
const makeNotifyingKeyedQueryAuthoring = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, true>,
) => {
  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryLocalMessage(config.data, config.error, Args)
  const InMessage = makeKeyedQueryInMessage()
  const OutMessage = makeKeyedQueryOutMessage(config.data, config.error, Args)
  const Definition = makeFamilyDeclaration(config.name, {
    key: KeyedQueryKey,
    Model,
    Message,
    InMessage,
    OutMessage,
    InitArgs: Schema.Tuple([]),
    operations: makeKeyedQueryArgumentOperations(Message),
  })
  const Fetch = Definition.makeCommand('Fetch', {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
    interrupt: {
      keyFields: ['requestKey', 'generation'],
      toKey: ({ requestKey, generation }) =>
        JSON.stringify([requestKey, generation]),
    },
  })
  const accessors = makeKeyedQueryAccessors(config, Args)
  const fetchApi = makeKeyedQueryFetchApi(Message, Fetch, accessors)

  return { Definition, Fetch, Args, OutMessage, config, accessors, fetchApi }
}

/** @internal Exact contracts supplied to a notifying keyed constructor. */
export interface KeyedQueryAuthoring<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> extends ReturnType<
  typeof makeNotifyingKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>
> {}

/** @internal Declares silent keyed contracts and the original Fetch definition. */
const makeSilentKeyedQueryAuthoring = <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, false>,
) => {
  const Args = Schema.Struct(config.args)
  const Model = makeKeyedQueryModel(config.data, config.error, Args)
  const Message = makeKeyedQueryLocalMessage(config.data, config.error, Args)
  const InMessage = makeKeyedQueryInMessage()
  const Definition = makeFamilyDeclaration(config.name, {
    key: KeyedQueryKey,
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([]),
    operations: makeKeyedQueryArgumentOperations(Message),
  })
  const Fetch = Definition.makeCommand('Fetch', {
    args: {
      args: Args,
      generation: Schema.Number,
      requestKey: Schema.String,
    },
    messages: [Message.CompletedFetch],
    interrupt: {
      keyFields: ['requestKey', 'generation'],
      toKey: ({ requestKey, generation }) =>
        JSON.stringify([requestKey, generation]),
    },
  })
  const accessors = makeKeyedQueryAccessors(config, Args)
  const fetchApi = makeKeyedQueryFetchApi(Message, Fetch, accessors)

  return { Definition, Fetch, Args, config, accessors, fetchApi }
}

/** @internal Exact contracts supplied to a silent keyed constructor. */
export interface SilentKeyedQueryAuthoring<
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
> extends ReturnType<
  typeof makeSilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields>
> {}

/** @internal Declares notifying keyed contracts through their named authoring boundary. */
export const defineKeyedQuery: <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, true>,
) => KeyedQueryAuthoring<Name, A, AI, E, EI, Fields> =
  makeNotifyingKeyedQueryAuthoring

/** @internal Declares silent keyed contracts through their named authoring boundary. */
export const defineSilentKeyedQuery: <
  Name extends string,
  A,
  AI,
  E,
  EI,
  Fields extends SyncFields,
>(
  config: KeyedQueryConfig<Name, A, AI, E, EI, Fields, false>,
) => SilentKeyedQueryAuthoring<Name, A, AI, E, EI, Fields> =
  makeSilentKeyedQueryAuthoring
