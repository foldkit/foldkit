import { Machine } from 'foldkit/experimental'

import {
  FetchQuotes,
  Message,
  QuoteRequest,
  SearchContext,
  queryToMaybeLabel,
} from './machine.contracts.js'

export const QuoteRequestDefinition = Machine.makeDefinition({
  State: QuoteRequest,
  Message,
  Context: SearchContext,
})

const { makeSharedTransitions, to, when, ignore } = QuoteRequestDefinition

export const quoteRequestMachine = QuoteRequestDefinition.makeMachine({
  initial: QuoteRequest.Idle(),
  shared: [
    makeSharedTransitions(['Idle', 'Loading', 'Failed'], {
      on: {
        SucceededFetchQuotes: to('Idle', () => ({
          model: QuoteRequest.Idle(),
        })),
      },
    }),
  ],
  states: {
    Idle: {
      on: {
        RequestedQuotes: [
          when(
            ({ context }) => queryToMaybeLabel(context.query),
            'Loading',
            ({ message, guardValue: label, context }) => ({
              model: QuoteRequest.Loading({
                offset: message.offset,
                limit: message.limit,
              }),
              commands: [
                FetchQuotes({
                  label,
                  offset: message.offset,
                  limit: message.limit,
                  searchGeneration: context.searchGeneration,
                }),
              ],
            }),
          ),
          ignore(),
        ],
      },
    },
    Loading: {
      on: {
        FailedFetchQuotes: to('Failed', ({ state, message }) => ({
          model: QuoteRequest.Failed({
            offset: state.offset,
            limit: state.limit,
            error: message.error,
          }),
        })),
      },
    },
    Failed: {
      on: {
        ClickedRetrySearch: [
          when(
            ({ context }) => queryToMaybeLabel(context.query),
            'Loading',
            ({ state, guardValue: label, context }) => ({
              model: QuoteRequest.Loading({
                offset: state.offset,
                limit: state.limit,
              }),
              commands: [
                FetchQuotes({
                  label,
                  offset: state.offset,
                  limit: state.limit,
                  searchGeneration: context.searchGeneration,
                }),
              ],
            }),
          ),
          ignore(),
        ],
      },
    },
  },
})
