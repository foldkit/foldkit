import type { spawnSync } from 'node:child_process'

export type WorkspacePackage = Readonly<{
  dir: string
  manifestPath: string
  packageJson: Readonly<{
    name: string
    version: string
    private?: boolean
    [key: string]: unknown
  }>
}>

export const workspacePackagesFromEntries: (
  root: string,
  entries: ReadonlyArray<unknown>,
) => ReadonlyArray<WorkspacePackage>

export const readWorkspacePackages: (
  root: string,
  options?: Readonly<{
    env?: NodeJS.ProcessEnv
    run?: typeof spawnSync
  }>,
) => ReadonlyArray<WorkspacePackage>

export const publicWorkspacePackages: (
  packages: ReadonlyArray<WorkspacePackage>,
) => ReadonlyArray<WorkspacePackage>

export const assertCompleteReleaseSet: (
  publicPackages: ReadonlyArray<WorkspacePackage>,
  releasePackages: ReadonlyArray<WorkspacePackage>,
) => void
