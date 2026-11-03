import { Array, Option, Result, String } from 'effect'
import { Command, type StorySimulation, message, steps } from 'foldkit/story'

import { VirtualList } from '@foldkit/ui'

import { Domain } from '../../shared/domain'
import { ReadCurrentTime, ReplaceSearchUrl } from '../command'
import {
  DomainsQuery,
  DomainsQueryArgs,
  DomainsQueryFailure,
} from '../domainsQuery'
import { Message } from '../message'
import { urlOrThrow } from '../model.fixture'
import { ResultsListBlock } from '../resultsList'
import { searchHref } from '../route'

export const domainsRequestKey = (args: DomainsQueryArgs) => {
  const request = DomainsQuery.requestRevalidationOrLoad(
    DomainsQuery.init().model,
    args,
  )

  return Option.getOrThrow(
    Array.head(
      Array.getSomes(
        Array.map(request.commands ?? [], Command.argsOf(DomainsQuery.Fetch)),
      ),
    ),
  ).requestKey
}

export const makeDomainsFetch = (args: DomainsQueryArgs, generation: number) =>
  DomainsQuery.Fetch({
    args,
    generation,
    requestKey: domainsRequestKey(args),
  })

export const resolveSearchTime = (
  searchGeneration: number,
  nowMillis: number,
  offset = 0,
  limit = 4,
  isRefreshRequested = false,
) =>
  Command.resolve(
    ReadCurrentTime({
      searchGeneration,
      offset,
      limit,
      isRefreshRequested,
    }),
    Message.CompletedReadCurrentTime({
      searchGeneration,
      nowMillis,
      offset,
      limit,
      isRefreshRequested,
    }),
  )

export const changeSearchQuery = (
  query: string,
  searchGeneration: number,
  nowMillis: number,
) =>
  steps(
    message(Message.UpdatedSearch({ value: query })),
    Command.resolve(
      ReplaceSearchUrl({
        q: Option.liftPredicate(query, String.isNonEmpty),
      }),
      Message.CompletedReplaceSearchUrl(),
    ),
    message(
      Message.ChangedUrl({
        url: urlOrThrow(`http://localhost${searchHref(query)}`),
      }),
    ),
    resolveSearchTime(searchGeneration, nowMillis),
  )

export const resolveDomainsSuccess = (
  args: DomainsQueryArgs,
  generation: number,
  domains: ReadonlyArray<Domain>,
  completedAtMillis = 0,
) =>
  Command.resolve(
    makeDomainsFetch(args, generation),
    DomainsQuery.Message.CompletedFetch({
      args,
      generation,
      requestKey: domainsRequestKey(args),
      result: Result.succeed(domains),
      completedAtMillis,
    }),
  )

export const resolveRemainingFirstPageDomains = (
  label: string,
  searchGeneration: number,
  generation: number,
  domains: ReadonlyArray<Domain>,
  nowMillis = 0,
) =>
  steps(
    resolveSearchTime(searchGeneration, nowMillis, 4, 56),
    resolveDomainsSuccess(
      { label, offset: 4, limit: 56 },
      generation,
      domains,
      nowMillis,
    ),
  )

export const resolveDomainsFailure = (
  args: DomainsQueryArgs,
  generation: number,
  failure: DomainsQueryFailure,
  completedAtMillis = 0,
) =>
  Command.resolve(
    makeDomainsFetch(args, generation),
    DomainsQuery.Message.CompletedFetch({
      args,
      generation,
      requestKey: domainsRequestKey(args),
      result: Result.fail(failure),
      completedAtMillis,
    }),
  )

export const resolveDomainsCancellation = (
  args: DomainsQueryArgs,
  generation: number,
) =>
  Command.resolve(
    DomainsQuery.Fetch.Interrupt(
      { requestKey: domainsRequestKey(args), generation },
      () => DomainsQuery.Message.CompletedCancelFetch(),
    ),
    DomainsQuery.Message.CompletedCancelFetch(),
  )

export const resolveResultsListScrolls = <Model, Message, OutMessage>(
  simulation: StorySimulation<Model, Message, OutMessage>,
): StorySimulation<Model, Message, OutMessage> =>
  Array.reduce(simulation.commands, simulation, (current, command) =>
    Option.match(Command.argsOf(VirtualList.test.ApplyScroll)(command), {
      onNone: () => current,
      onSome: args =>
        Command.resolve(
          VirtualList.test.ApplyScroll(args),
          ResultsListBlock.Message.CompletedApplyScroll({
            version: args.version,
            outcome: VirtualList.ApplyScrollOutcome.Skipped(),
          }),
        )(current),
    }),
  )
