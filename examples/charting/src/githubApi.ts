import {
  Array,
  Context,
  Data,
  Effect,
  Layer,
  Number,
  Option,
  Schema as S,
  Schedule,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'

import { fetchJson, isSuccessfulStatus, makeUrl } from './http'

// CONSTANT

const GITHUB_REPOSITORY_API = 'https://api.github.com/repos/foldkit/foldkit'
const HTTP_ACCEPTED = 202
const STARGAZER_PAGE_SIZE = 100
const MAX_STARGAZER_PAGES = 10
const STAT_MAX_RETRIES = 1
const STAT_RETRY_DELAY = '2 seconds' as const
const RELEASE_PAGE_SIZE = 100

// SCHEMA

export const GitHubRepositoryResponse = S.Struct({
  stargazers_count: S.Number,
  forks_count: S.Number,
  watchers_count: S.Number,
  open_issues_count: S.Number,
  pushed_at: S.String,
  default_branch: S.String,
})

export const GitHubContributorResponse = S.Struct({
  login: S.String,
  contributions: S.Number,
  avatar_url: S.OptionFromOptional(S.String),
})
export type GitHubContributorResponse = typeof GitHubContributorResponse.Type

export const GitHubIssueResponse = S.Struct({
  pull_request: S.OptionFromOptional(S.Unknown),
})

export const GitHubPullRequestResponse = S.Struct({
  id: S.Number,
})

export const GitHubReleaseResponse = S.Struct({
  published_at: S.OptionFromOptional(S.String),
})

export const GitHubStargazerResponse = S.Struct({
  starred_at: S.String,
})

export const GitHubCommitActivityResponse = S.Struct({
  week: S.Number,
  total: S.Number,
})

// SERVICE

export type GitHubStatResult<A> = Readonly<{
  data: Option.Option<A>
  warnings: ReadonlyArray<string>
}>

type GitHubApiShape = Readonly<{
  fetchRepository: Effect.Effect<typeof GitHubRepositoryResponse.Type, Error>
  fetchContributors: Effect.Effect<
    ReadonlyArray<typeof GitHubContributorResponse.Type>,
    Error
  >
  fetchIssues: Effect.Effect<
    ReadonlyArray<typeof GitHubIssueResponse.Type>,
    Error
  >
  fetchPullRequests: Effect.Effect<
    ReadonlyArray<typeof GitHubPullRequestResponse.Type>,
    Error
  >
  fetchReleases: (
    yearCutoffMilliseconds: number,
  ) => Effect.Effect<ReadonlyArray<typeof GitHubReleaseResponse.Type>, Error>
  fetchStargazers: (
    stargazerCount: number,
  ) => Effect.Effect<ReadonlyArray<typeof GitHubStargazerResponse.Type>, Error>
  fetchCommitActivity: Effect.Effect<
    GitHubStatResult<ReadonlyArray<typeof GitHubCommitActivityResponse.Type>>,
    never
  >
}>

export class GitHubApi extends Context.Service<GitHubApi, GitHubApiShape>()(
  'charting/GitHubApi',
) {}

class GitHubStatsPending extends Data.TaggedError('GitHubStatsPending') {}
class GitHubStatError extends Data.TaggedError('GitHubStatError') {}

const fetchOptionalGitHubStat =
  (client: HttpClient.HttpClient) =>
  <A, I>(schema: S.Codec<A, I>) =>
  (path: string, label: string): Effect.Effect<GitHubStatResult<A>, never> => {
    const url = `${GITHUB_REPOSITORY_API}${path}`

    const attempt: Effect.Effect<
      GitHubStatResult<A>,
      GitHubStatsPending
    > = Effect.gen(function* () {
      const response = yield* client
        .execute(HttpClientRequest.get(url))
        .pipe(Effect.mapError(() => new GitHubStatError()))

      if (response.status === HTTP_ACCEPTED) {
        return yield* Effect.fail(new GitHubStatsPending())
      }

      if (!isSuccessfulStatus(response.status)) {
        return {
          data: Option.none<A>(),
          warnings: [`${label} returned HTTP ${response.status}.`],
        }
      }

      const data = yield* response.json.pipe(
        Effect.flatMap(json => S.decodeUnknownEffect(schema)(json)),
        Effect.option,
      )

      return Option.match(data, {
        onNone: () => ({
          data: Option.none<A>(),
          warnings: [`${label} returned an unexpected response shape.`],
        }),
        onSome: (value): GitHubStatResult<A> => ({
          data: Option.some(value),
          warnings: [],
        }),
      })
    }).pipe(
      Effect.catchTag('GitHubStatError', () =>
        Effect.succeed({
          data: Option.none<A>(),
          warnings: [`${label} is unavailable right now.`],
        }),
      ),
    )

    return attempt.pipe(
      Effect.retry({
        while: error => error._tag === 'GitHubStatsPending',
        schedule: Schedule.spaced(STAT_RETRY_DELAY),
        times: STAT_MAX_RETRIES,
      }),
      Effect.catchTag('GitHubStatsPending', () =>
        Effect.succeed({
          data: Option.none<A>(),
          warnings: [`${label} is still being prepared by GitHub.`],
        }),
      ),
    )
  }

export const GitHubApiLive: Layer.Layer<
  GitHubApi,
  never,
  HttpClient.HttpClient
> = Layer.effect(
  GitHubApi,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const fetch_ = fetchJson(client)
    const fetchStat_ = fetchOptionalGitHubStat(client)
    return {
      fetchRepository: fetch_(GitHubRepositoryResponse)(GITHUB_REPOSITORY_API),
      fetchContributors: fetch_(S.Array(GitHubContributorResponse))(
        makeUrl(`${GITHUB_REPOSITORY_API}/contributors`, {
          per_page: '100',
          anon: 'false',
        }),
      ),
      fetchIssues: fetch_(S.Array(GitHubIssueResponse))(
        makeUrl(`${GITHUB_REPOSITORY_API}/issues`, {
          state: 'open',
          per_page: '100',
        }),
      ),
      fetchPullRequests: fetch_(S.Array(GitHubPullRequestResponse))(
        makeUrl(`${GITHUB_REPOSITORY_API}/pulls`, {
          state: 'open',
          per_page: '100',
        }),
      ),
      fetchReleases: (yearCutoffMilliseconds: number) => {
        const fetchPage = (page: number) =>
          fetch_(S.Array(GitHubReleaseResponse))(
            makeUrl(`${GITHUB_REPOSITORY_API}/releases`, {
              per_page: `${RELEASE_PAGE_SIZE}`,
              page: `${page}`,
            }),
          )

        const fetchFrom = (
          page: number,
          accumulated: ReadonlyArray<typeof GitHubReleaseResponse.Type>,
        ): Effect.Effect<
          ReadonlyArray<typeof GitHubReleaseResponse.Type>,
          Error
        > =>
          fetchPage(page).pipe(
            Effect.flatMap(releases =>
              Array.match(releases, {
                onEmpty: () => Effect.succeed(accumulated),
                onNonEmpty: releases => {
                  const withinYear = Array.filter(releases, release =>
                    Option.exists(
                      release.published_at,
                      publishedAt =>
                        Date.parse(publishedAt) >= yearCutoffMilliseconds,
                    ),
                  )

                  const nextAccumulated = Array.appendAll(
                    accumulated,
                    withinYear,
                  )
                  const hitCutoff =
                    Array.length(withinYear) < Array.length(releases)
                  const isLastPage = Array.length(releases) < RELEASE_PAGE_SIZE

                  if (!hitCutoff && !isLastPage) {
                    return fetchFrom(Number.increment(page), nextAccumulated)
                  }
                  return Effect.succeed(nextAccumulated)
                },
              }),
            ),
          )

        return fetchFrom(1, [])
      },
      fetchStargazers: (stargazerCount: number) => {
        const pageCount = Math.min(
          MAX_STARGAZER_PAGES,
          Math.ceil(stargazerCount / STARGAZER_PAGE_SIZE),
        )
        return Effect.forEach(
          Array.range(1, Math.max(1, pageCount)),
          page =>
            fetch_(S.Array(GitHubStargazerResponse))(
              makeUrl(`${GITHUB_REPOSITORY_API}/stargazers`, {
                per_page: `${STARGAZER_PAGE_SIZE}`,
                page: `${page}`,
              }),
              { Accept: 'application/vnd.github.star+json' },
            ),
          { concurrency: 'unbounded' },
        ).pipe(Effect.map(Array.flatten))
      },
      fetchCommitActivity: fetchStat_(S.Array(GitHubCommitActivityResponse))(
        '/stats/commit_activity',
        'Commit activity',
      ),
    }
  }),
)
