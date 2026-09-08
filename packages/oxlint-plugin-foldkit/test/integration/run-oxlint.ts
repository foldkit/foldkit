import { Array } from 'effect'
import { spawnSync } from 'node:child_process'
import { isAbsolute, relative } from 'node:path'

export type LintDiagnostic = Readonly<{
  code: string
  filename: string
  message: string
}>

const parseDiagnostic = (cwd: string, value: unknown): LintDiagnostic => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('code' in value) ||
    typeof value.code !== 'string' ||
    !('filename' in value) ||
    typeof value.filename !== 'string' ||
    !('message' in value) ||
    typeof value.message !== 'string'
  ) {
    throw new Error('Oxlint returned an invalid diagnostic')
  }
  const filename = isAbsolute(value.filename)
    ? relative(cwd, value.filename)
    : value.filename
  return {
    code: value.code,
    filename: filename.replaceAll('\\', '/'),
    message: value.message,
  }
}

const parseDiagnostics = (
  cwd: string,
  output: string,
): ReadonlyArray<LintDiagnostic> => {
  const result: unknown = JSON.parse(output)

  if (
    typeof result !== 'object' ||
    result === null ||
    !('diagnostics' in result) ||
    !globalThis.Array.isArray(result.diagnostics)
  ) {
    throw new Error('Oxlint returned invalid JSON output')
  }
  return result.diagnostics.map(diagnostic => parseDiagnostic(cwd, diagnostic))
}

export const runOxlint = ({
  oxlintBin,
  cwd,
  configPath,
  target,
  fix = false,
}: Readonly<{
  oxlintBin: string
  cwd: string
  configPath: string
  target: string
  fix?: boolean
}>): ReadonlyArray<LintDiagnostic> => {
  const args = [
    '--format=json',
    ...(fix ? ['--fix'] : []),
    '--config',
    configPath,
    target,
  ]
  const result = spawnSync(process.execPath, [oxlintBin, ...args], {
    cwd,
    encoding: 'utf8',
  })

  if (result.error !== undefined) {
    throw result.error
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Oxlint exited with ${String(result.status)}: ${result.stderr}`,
    )
  }
  const diagnostics = parseDiagnostics(cwd, result.stdout)

  if (result.status === 1 && Array.isReadonlyArrayEmpty(diagnostics)) {
    throw new Error('Oxlint exited with an error but returned no diagnostics')
  }
  return diagnostics
}
