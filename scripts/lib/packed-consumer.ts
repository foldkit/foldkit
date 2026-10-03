import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

export class PackedConsumerError extends Error {}

export const fail = (message: string): never => {
  throw new PackedConsumerError(message)
}

export const assertConsumer: (
  condition: boolean,
  message: string,
) => asserts condition = (
  condition: boolean,
  message: string,
): asserts condition => {
  if (!condition) {
    fail(message)
  }
}

export type RunOptions = Readonly<{
  cwd?: string
  env?: Readonly<Record<string, string>>
  inherit?: boolean
  timeoutMs?: number
}>

export type RunResult = Readonly<{
  stdout: string
  stderr: string
  status: number | null
}>

export const run = (
  command: string,
  args: ReadonlyArray<string>,
  options: RunOptions = {},
): RunResult => {
  const result = spawnSync(command, [...args], {
    cwd: options.cwd,
    encoding: 'utf-8',
    env: { ...process.env, ...options.env },
    stdio: options.inherit ? 'inherit' : 'pipe',
    timeout: options.timeoutMs ?? 300_000,
  })

  return {
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
    status: result.status,
  }
}

export const parseJson = <A>(raw: string): A => JSON.parse(raw)

export const readJson = <A>(path: string): A =>
  parseJson<A>(readFileSync(path, 'utf8'))

type PackOutput = ReadonlyArray<Readonly<{ filename?: string }>>

type PackedConsumerToolsOptions = Readonly<{
  repoRoot: string
  logPrefix: string
}>

export const makePackedConsumerTools = ({
  repoRoot,
  logPrefix,
}: PackedConsumerToolsOptions) => {
  const log = (message: string): void => {
    console.log(`[${logPrefix}] ${message}`)
  }

  const runRequired = (
    label: string,
    command: string,
    args: ReadonlyArray<string>,
    options: RunOptions = {},
  ): RunResult => {
    log(label)
    const result = run(command, args, options)
    if (result.status !== 0) {
      const output = `${result.stdout}${result.stderr}`.trim()
      fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
    }
    return result
  }

  const packPackage = (
    label: string,
    packageDir: string,
    outputDirectory?: string,
  ): string => {
    const args = ['pack', '--json']
    if (outputDirectory !== undefined) {
      args.push('--pack-destination', outputDirectory)
    }
    const packageRoot = resolve(repoRoot, packageDir)
    const result = runRequired(label, 'npm', args, { cwd: packageRoot })
    const filename = parseJson<PackOutput>(result.stdout)[0]?.filename
    assertConsumer(
      filename !== undefined,
      `${label} did not return a tarball filename`,
    )
    log(`Packed ${filename}`)
    return join(outputDirectory ?? packageRoot, filename)
  }

  const withTempDir = async (
    prefix: string,
    useTempDir: (tempDir: string) => Promise<void>,
  ): Promise<void> => {
    const tempDir = mkdtempSync(join(tmpdir(), prefix))
    log(`Consumer project: ${tempDir}`)
    try {
      await useTempDir(tempDir)
    } finally {
      log('Cleaning up the consumer project...')
      rmSync(tempDir, { recursive: true, force: true })
    }
  }

  return { log, packPackage, runRequired, withTempDir }
}

export const messageFor = (error: unknown): string => {
  if (error instanceof PackedConsumerError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.stack ?? error.message
  }
  return String(error)
}
