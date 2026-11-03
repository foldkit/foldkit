import type { readPreState } from '@changesets/pre'
import type { readChangesets } from '@changesets/read'

import type { WorkspacePackage } from './workspace-packages.mjs'

export const readStagedChangesets: (
  options: Readonly<{ root: string; outputDirectory: string }>,
) => Promise<
  Readonly<{
    changesets: Awaited<ReturnType<typeof readChangesets>>
    preState: Awaited<ReturnType<typeof readPreState>>
  }>
>

export const selectPlannedPackageVersions: (
  packageJsons: ReadonlyArray<WorkspacePackage['packageJson']>,
  releases: ReadonlyArray<Readonly<{ name: string; newVersion: string }>>,
) => ReadonlyArray<WorkspacePackage['packageJson']>

export const assertPackedPeerCompatibility: (
  packages: ReadonlyArray<
    Readonly<{ packageJson: WorkspacePackage['packageJson'] }>
  >,
) => void

export const stagePackedConsumerPackages: (
  options: Readonly<{
    root: string
    outputDirectory: string
    packageDirectories: ReadonlyArray<string>
  }>,
) => Promise<
  ReadonlyArray<WorkspacePackage & Readonly<{ sourceVersion: string }>>
>
