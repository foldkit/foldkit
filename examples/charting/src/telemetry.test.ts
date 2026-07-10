import { Array, Effect, Layer, Match as M, Option, String } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/unstable/http'
import { expect, test } from 'vitest'

import { GitHubApiLive } from './githubApi'
import {
  mockGitHubRepository,
  mockNpmDownloads,
  mockNpmPackument,
} from './main.fixtures'
import { NpmApiLive } from './npmApi'
import { fetchRawTelemetry, transformTelemetry } from './telemetry'

const fetchTelemetryWithRestrictedStargazerPage = async (
  restrictedPage: number,
) => {
  const mockClient = HttpClient.make(request =>
    Effect.sync(() => {
      const body = M.value(request.url).pipe(
        M.when(String.includes('/contributors'), () => [
          { login: 'devin', contributions: 42 },
        ]),
        M.when(String.includes('/issues'), () => [{}, { pull_request: {} }]),
        M.when(String.includes('/pulls'), () => [{ id: 1 }]),
        M.when(String.includes('/releases'), () => [
          {
            tag_name: 'v0.115.0',
            published_at: '2026-06-20T12:00:00Z',
            prerelease: false,
            draft: false,
          },
        ]),
        M.when(String.includes('/stargazers'), () => [
          { starred_at: '2026-06-15T12:00:00Z' },
        ]),
        M.when(String.includes('/stats/commit_activity'), () => [
          { week: 1781481600, total: 5 },
        ]),
        M.when(String.includes('/stats/code_frequency'), () => [
          [1781481600, 120, -35],
        ]),
        M.when(String.includes('api.npmjs.org'), () => mockNpmDownloads),
        M.when(String.includes('registry.npmjs.org'), () => mockNpmPackument),
        M.orElse(() => mockGitHubRepository),
      )

      const isRestrictedStargazerPage =
        request.url.includes('/stargazers') &&
        request.url.includes(`page=${restrictedPage}`)

      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), {
          status: isRestrictedStargazerPage ? 401 : 200,
        }),
      )
    }),
  )

  const telemetryLayer = Layer.mergeAll(GitHubApiLive, NpmApiLive).pipe(
    Layer.provide(Layer.succeed(HttpClient.HttpClient, mockClient)),
  )
  const raw = await fetchRawTelemetry.pipe(
    Effect.provide(telemetryLayer),
    Effect.runPromise,
  )

  return { raw, telemetry: transformTelemetry(raw) }
}

test('keeps the current star total without charting partial history', async () => {
  const { raw, telemetry } = await fetchTelemetryWithRestrictedStargazerPage(4)

  expect(telemetry.repository.stars).toBe(342)
  expect(telemetry.repository.openIssues).toBe(1)
  expect(Array.length(telemetry.packages)).toBeGreaterThan(0)
  expect(telemetry.stargazerHistory).toBe('Unavailable')
  expect(Array.every(telemetry.weeks, week => week.cumulativeStars === 0)).toBe(
    true,
  )
  expect(Option.isSome(raw.stargazers.data)).toBe(true)
  if (Option.isSome(raw.stargazers.data)) {
    expect(Array.length(raw.stargazers.data.value)).toBe(3)
  }
  expect(telemetry.warnings).toContain(
    'Some stargazer history is unavailable. The current star total is still shown.',
  )
})

test('keeps the current star total when stargazer history is unavailable', async () => {
  const { raw, telemetry } = await fetchTelemetryWithRestrictedStargazerPage(1)

  expect(telemetry.repository.stars).toBe(342)
  expect(telemetry.stargazerHistory).toBe('Unavailable')
  expect(Option.isNone(raw.stargazers.data)).toBe(true)
  expect(Array.every(telemetry.weeks, week => week.cumulativeStars === 0)).toBe(
    true,
  )
  expect(telemetry.warnings).toContain(
    'Some stargazer history is unavailable. The current star total is still shown.',
  )
})
