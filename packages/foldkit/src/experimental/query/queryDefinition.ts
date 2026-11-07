import { Schema } from 'effect'

import { makeFamilyDeclaration } from '../contracted/familyLayer.js'
import type { QueryConfig } from './queryContract.js'
import {
  makeQueryAccessors,
  makeQueryClockOperations,
  makeQueryFetchApi,
  makeQueryInMessage,
  makeQueryLocalMessage,
  makeQueryModel,
  makeQueryOutMessage,
} from './queryContract.js'

/** @internal Canonical identity shared by checked Query specializations. */
export const QueryKey = Symbol('QueryFamily')

/** @internal Declares the notifying Query contracts and original Fetch definition. */
export const defineQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, true>,
) => {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryLocalMessage(config.data, config.error)
  const InMessage = makeQueryInMessage()
  const OutMessage = makeQueryOutMessage(config.data, config.error)
  const Definition = makeFamilyDeclaration(config.name, {
    key: QueryKey,
    Model,
    Message,
    InMessage,
    OutMessage,
    InitArgs: Schema.Tuple([]),
    operations: makeQueryClockOperations(Message),
  })
  const Fetch = Definition.makeCommand('Fetch', {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
    interrupt: {
      keyFields: ['generation'],
      toKey: ({ generation }) => `${generation}`,
    },
  })
  const accessors = makeQueryAccessors(config)
  const fetchApi = makeQueryFetchApi(Message, Fetch)

  return { Definition, Fetch, OutMessage, config, accessors, fetchApi }
}

/** @internal Exact contracts supplied to a notifying Query constructor. */
export type QueryAuthoring<Name extends string, A, AI, E, EI> = ReturnType<
  typeof defineQuery<Name, A, AI, E, EI>
>

/** @internal Declares the silent Query contracts and original Fetch definition. */
export const defineSilentQuery = <Name extends string, A, AI, E, EI>(
  config: QueryConfig<Name, A, AI, E, EI, false>,
) => {
  const Model = makeQueryModel(config.data, config.error)
  const Message = makeQueryLocalMessage(config.data, config.error)
  const InMessage = makeQueryInMessage()
  const Definition = makeFamilyDeclaration(config.name, {
    key: QueryKey,
    Model,
    Message,
    InMessage,
    InitArgs: Schema.Tuple([]),
    operations: makeQueryClockOperations(Message),
  })
  const Fetch = Definition.makeCommand('Fetch', {
    args: { generation: Schema.Number },
    messages: [Message.CompletedFetch],
    interrupt: {
      keyFields: ['generation'],
      toKey: ({ generation }) => `${generation}`,
    },
  })
  const accessors = makeQueryAccessors(config)
  const fetchApi = makeQueryFetchApi(Message, Fetch)

  return { Definition, Fetch, config, accessors, fetchApi }
}

/** @internal Exact contracts supplied to a silent Query constructor. */
export type SilentQueryAuthoring<
  Name extends string,
  A,
  AI,
  E,
  EI,
> = ReturnType<typeof defineSilentQuery<Name, A, AI, E, EI>>
