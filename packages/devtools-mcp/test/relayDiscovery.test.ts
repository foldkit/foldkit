import { symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, it } from 'vitest'

import {
  listedIds,
  openBrowserRuntime,
  openSession,
  startApplication,
  useWorkspace,
} from './relayFixtures.ts'

const TEST_TIMEOUT = 30_000
// NOTE: A junction needs no elevation on Windows, where a directory symlink
// does.
const DIRECTORY_LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir'

const workspace = useWorkspace()

it(
  'finds the enclosing application from a directory inside it and through a symlink',
  async () => {
    const application = join(workspace.root, 'application')
    const server = await startApplication(application)
    await openBrowserRuntime(server, 'runtime-application')
    const link = join(workspace.root, 'link-to-application')
    await symlink(application, link, DIRECTORY_LINK_TYPE)

    const nested = await openSession(join(application, 'src'))
    const linked = await openSession(link)

    await expect
      .poll(() => listedIds(nested))
      .toStrictEqual(['runtime-application'])
    expect(await listedIds(linked)).toStrictEqual(['runtime-application'])
  },
  TEST_TIMEOUT,
)

it(
  'reaches only the nearest enclosing application',
  async () => {
    const application = join(workspace.root, 'application')
    const workspaceServer = await startApplication(workspace.root)
    const applicationServer = await startApplication(application)
    await openBrowserRuntime(workspaceServer, 'runtime-workspace')
    await openBrowserRuntime(applicationServer, 'runtime-application')
    const workspaceSession = await openSession(workspace.root)
    const nested = await openSession(join(application, 'src'))

    await expect
      .poll(() => listedIds(workspaceSession))
      .toStrictEqual(['runtime-workspace', 'runtime-application'])
    expect(await listedIds(nested)).toStrictEqual(['runtime-application'])
  },
  TEST_TIMEOUT,
)
