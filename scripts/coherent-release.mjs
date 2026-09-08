import { appendFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NpmRegistry,
  promoteAndFinalizeCurrentWorkspace,
  runCoherentUpload,
  verifyRegistrySnapshot,
  waitForTaggedSnapshot,
} from './lib/coherent-release.mjs'
import {
  publicWorkspacePackages,
  readWorkspacePackages,
} from './lib/workspace-packages.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const fail = message => {
  throw new Error(message)
}

const commit = () => {
  const value = process.env['GITHUB_SHA']

  if (value === undefined) {
    return fail('GITHUB_SHA is required for an immutable package release')
  }

  return value
}

const main = async () => {
  const command = process.argv.at(2)

  if (command === 'stable' || command === 'canary') {
    const result = await runCoherentUpload({
      root: REPO_ROOT,
      channel: command,
      commit: commit(),
    })

    if (command === 'stable' && result.packages.length > 0) {
      console.log(
        'All stable versions are uploaded and verified. Run `pnpm release:promote` with an interactive npm session to advance latest.',
      )
    }

    if (command === 'canary') {
      const cli = result.packages.find(
        pkg => pkg.packageJson.name === 'create-foldkit-app',
      )

      if (cli === undefined) {
        return fail('the canary release has no create-foldkit-app package')
      }

      const summary =
        `## Package canary\n\n` +
        `Commit: \`${commit()}\`\n\n` +
        `Run: \`npx create-foldkit-app@${cli.packageJson.version}\`\n\n` +
        result.packages
          .map(
            pkg => `- \`${pkg.packageJson.name}@${pkg.packageJson.version}\``,
          )
          .join('\n') +
        '\n'

      const summaryPath = process.env['GITHUB_STEP_SUMMARY']

      if (summaryPath === undefined) {
        console.log(summary)
      } else {
        appendFileSync(summaryPath, summary)
      }
    }

    return
  }

  if (command === 'promote') {
    const result = await promoteAndFinalizeCurrentWorkspace({ root: REPO_ROOT })

    console.log(
      `Promoted ${String(result.promoted.length)} packages; ${String(result.alreadyPromoted.length)} were already current.`,
    )
    console.log(`Dispatched stable finalization for ${result.publishedCommit}.`)

    return
  }

  if (command === 'verify-latest') {
    const workspacePackages = readWorkspacePackages(REPO_ROOT)
    const packages = publicWorkspacePackages(workspacePackages)
    const registry = new NpmRegistry()

    await verifyRegistrySnapshot(
      packages,
      registry,
      new Set(workspacePackages.map(pkg => pkg.packageJson.name)),
    )

    await waitForTaggedSnapshot({ packages, tag: 'latest', registry })

    console.log('The complete stable package set is published and promoted.')

    return
  }

  return fail(
    'Usage: node scripts/coherent-release.mjs stable|canary|promote|verify-latest',
  )
}

main().catch(error => {
  const message = error instanceof Error ? error.stack : String(error)

  console.error(`[coherent-release] FAIL ${message}`)
  process.exitCode = 1
})
