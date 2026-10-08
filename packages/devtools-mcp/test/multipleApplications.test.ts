import { Array, Effect, Option, pipe } from 'effect'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import type { RelayClient } from '../src/relayClient.ts'
import { buildTools } from '../src/tools.ts'
import {
  POLL_TIMEOUT,
  RELAY_PATH,
  catchAllUpgrades,
  connectionCount,
  listedIds,
  openBrowserRuntime,
  openSession,
  replay,
  startApplication,
  useWorkspace,
} from './relayFixtures.ts'

const TEST_TIMEOUT = 30_000
const OBSERVATION_WINDOW = 1_000
const REQUESTS_PER_SESSION = 10
const UNKNOWN_RUNTIME_FAILURE_BUDGET = 5_000

const workspace = useWorkspace()

const applicationRoot = (application: string) =>
  join(workspace.root, 'applications', application)

const findTool = (client: RelayClient, name: string) =>
  pipe(
    buildTools(client),
    Array.findFirst(candidate => candidate.name === name),
    Option.getOrThrowWith(() => new Error(`tool ${name} is missing`)),
  )

const toolText = async (
  client: RelayClient,
  name: string,
  input: unknown,
): Promise<string> => {
  const result = await Effect.runPromise(findTool(client, name).handle(input))
  return pipe(
    Array.head(result.content),
    Option.map(({ text }) => text),
    Option.getOrThrowWith(() => new Error(`tool ${name} returned no content`)),
  )
}

const toolOutput = async (
  client: RelayClient,
  name: string,
  input: unknown,
): Promise<unknown> => JSON.parse(await toolText(client, name, input))

it(
  'keeps every session connected to its own application when several run at once',
  async () => {
    const seenPaths: Array<string> = []
    const names = ['first', 'second', 'third']
    const applications = await Promise.all(
      names.map(async name => ({
        name,
        server: await startApplication(applicationRoot(name), [
          catchAllUpgrades(seenPaths),
        ]),
      })),
    )
    await Promise.all(
      applications.map(({ name, server }) =>
        openBrowserRuntime(server, `runtime-${name}`),
      ),
    )
    const sessions = await Promise.all(
      names.flatMap(name => [
        openSession(applicationRoot(name)).then(client => ({ name, client })),
        openSession(applicationRoot(name)).then(client => ({ name, client })),
      ]),
    )

    await expect
      .poll(
        () => Promise.all(sessions.map(({ client }) => listedIds(client))),
        { timeout: POLL_TIMEOUT },
      )
      .toStrictEqual(sessions.map(({ name }) => [`runtime-${name}`]))

    await new Promise(done => setTimeout(done, OBSERVATION_WINDOW))

    expect(
      await Promise.all(sessions.map(({ client }) => listedIds(client))),
    ).toStrictEqual(sessions.map(({ name }) => [`runtime-${name}`]))
    const requestIndices = Array.range(0, REQUESTS_PER_SESSION - 1)
    const replayed = await Promise.all(
      sessions.flatMap(({ client, name }, sessionIndex) =>
        requestIndices.map(requestIndex =>
          replay(
            client,
            `runtime-${name}`,
            sessionIndex * REQUESTS_PER_SESSION + requestIndex,
          ),
        ),
      ),
    )
    expect(replayed).toStrictEqual(
      sessions.flatMap(({ name }, sessionIndex) =>
        requestIndices.map(requestIndex => ({
          connectionId: `runtime-${name}`,
          keyframeIndex: sessionIndex * REQUESTS_PER_SESSION + requestIndex,
        })),
      ),
    )
    expect(seenPaths).not.toContain(RELAY_PATH)
    expect(connectionCount()).toBe(sessions.length)
  },
  TEST_TIMEOUT,
)

it(
  'reaches every application under the workspace root as they start and stop',
  async () => {
    const first = await startApplication(applicationRoot('first'))
    const second = await startApplication(applicationRoot('second'))
    await openBrowserRuntime(first, 'runtime-first')
    await openBrowserRuntime(second, 'runtime-second')
    const session = await openSession(workspace.root)

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first', 'runtime-second'])

    const third = await startApplication(applicationRoot('third'))
    await openBrowserRuntime(third, 'runtime-third')
    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first', 'runtime-second', 'runtime-third'])

    await first.close()
    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-second', 'runtime-third'])

    const startedAt = Date.now()
    expect(await replay(session, 'runtime-first', 4)).toContain(
      'No connected Foldkit Runtime has the id runtime-first',
    )
    expect(Date.now() - startedAt).toBeLessThan(UNKNOWN_RUNTIME_FAILURE_BUDGET)
  },
  TEST_TIMEOUT,
)

it(
  'names the project root of each listed Runtime',
  async () => {
    const first = await startApplication(applicationRoot('first'))
    const second = await startApplication(applicationRoot('second'))
    await openBrowserRuntime(first, 'runtime-first')
    await openBrowserRuntime(second, 'runtime-second')
    const session = await openSession(workspace.root)

    await expect
      .poll(() => toolOutput(session, 'foldkit_list_runtimes', {}), {
        timeout: POLL_TIMEOUT,
      })
      .toStrictEqual({
        _tag: 'ResponseRuntimes',
        runtimes: [
          {
            connectionId: 'runtime-first',
            url: 'http://app/',
            title: 'runtime-first',
            projectRoot: first.config.root,
          },
          {
            connectionId: 'runtime-second',
            url: 'http://app/',
            title: 'runtime-second',
            projectRoot: second.config.root,
          },
        ],
      })
  },
  TEST_TIMEOUT,
)

it(
  'defaults a tool call to the newest Runtime of the newest dev server',
  async () => {
    const older = await startApplication(applicationRoot('first'))
    const newer = await startApplication(applicationRoot('second'))
    await openBrowserRuntime(newer, 'runtime-newer-server-older')
    await openBrowserRuntime(newer, 'runtime-newer-server-newer')
    await openBrowserRuntime(older, 'runtime-older-server')
    const session = await openSession(workspace.root)
    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual([
        'runtime-older-server',
        'runtime-newer-server-older',
        'runtime-newer-server-newer',
      ])

    expect(
      await toolOutput(session, 'foldkit_replay_to_keyframe', {
        keyframe_index: 7,
      }),
    ).toStrictEqual({
      _tag: 'ResponseReplayed',
      model: { connectionId: 'runtime-newer-server-newer', keyframeIndex: 7 },
    })
  },
  TEST_TIMEOUT,
)

it(
  'keeps a dev server reachable after a second one for the same root stops',
  async () => {
    const first = await startApplication(applicationRoot('first'))
    await openBrowserRuntime(first, 'runtime-first')
    const duplicate = await startApplication(applicationRoot('first'))
    await openBrowserRuntime(duplicate, 'runtime-duplicate')
    const session = await openSession(applicationRoot('first'))

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first', 'runtime-duplicate'])

    await duplicate.close()

    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first'])
    expect(await replay(session, 'runtime-first', 1)).toStrictEqual({
      connectionId: 'runtime-first',
      keyframeIndex: 1,
    })
  },
  TEST_TIMEOUT,
)

it(
  'fails at once for a listed Runtime whose dev server stopped',
  async () => {
    const first = await startApplication(applicationRoot('first'))
    const second = await startApplication(applicationRoot('second'))
    await openBrowserRuntime(first, 'runtime-first')
    await openBrowserRuntime(second, 'runtime-second')
    const session = await openSession(workspace.root)
    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first', 'runtime-second'])

    await first.close()

    const startedAt = Date.now()
    expect(await replay(session, 'runtime-first', 2)).toContain(
      'No connected Foldkit Runtime has the id runtime-first',
    )
    expect(Date.now() - startedAt).toBeLessThan(UNKNOWN_RUNTIME_FAILURE_BUDGET)
  },
  TEST_TIMEOUT,
)

it(
  'reaches a listed Runtime through the replacement relay after its dev server restarts',
  async () => {
    const application = applicationRoot('first')
    const server = await startApplication(application)
    await openBrowserRuntime(server, 'runtime-first')
    const session = await openSession(application)
    await expect
      .poll(() => listedIds(session), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first'])

    await server.restart()
    await openBrowserRuntime(server, 'runtime-first')
    const observer = await openSession(application)
    await expect
      .poll(() => listedIds(observer), { timeout: POLL_TIMEOUT })
      .toStrictEqual(['runtime-first'])

    expect(await replay(session, 'runtime-first', 3)).toStrictEqual({
      connectionId: 'runtime-first',
      keyframeIndex: 3,
    })
  },
  TEST_TIMEOUT,
)

it(
  'asks for a dev page when a tool call finds no Runtime',
  async () => {
    const application = applicationRoot('first')
    await startApplication(application)
    const session = await openSession(application)

    expect(
      await toolText(session, 'foldkit_replay_to_keyframe', {
        keyframe_index: 1,
      }),
    ).toBe(
      'Error: No connected Foldkit runtimes. Open a Foldkit dev page and try again.',
    )
  },
  TEST_TIMEOUT,
)
