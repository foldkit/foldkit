import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const generatorDirectory = dirname(fileURLToPath(import.meta.url))
const workspaceDirectory = resolve(generatorDirectory, '../..')
const require = createRequire(import.meta.url)
const typedocDirectory = dirname(require.resolve('typedoc/package.json'))
const typedocExecutable = join(typedocDirectory, 'bin/typedoc')
const projects = new Map([
  ['foldkit', 'packages/foldkit'],
  ['ui', 'packages/ui'],
])

const requestedProjects = process.argv.slice(2)
const selectedProjects = requestedProjects.length
  ? requestedProjects.map(projectName => {
      const projectDirectory = projects.get(projectName)

      if (projectDirectory === undefined) {
        throw new Error(`Unknown API reference project: ${projectName}`)
      }

      return projectDirectory
    })
  : [...projects.values()]

for (const projectDirectory of selectedProjects) {
  const result = spawnSync(process.execPath, [typedocExecutable], {
    cwd: join(workspaceDirectory, projectDirectory),
    stdio: 'inherit',
  })

  if (result.error !== undefined) {
    throw result.error
  }

  if (result.status === 0) {
    continue
  }

  if (result.signal !== null) {
    throw new Error(
      `TypeDoc generation for ${projectDirectory} stopped with signal ${result.signal}`,
    )
  }

  throw new Error(
    `TypeDoc generation for ${projectDirectory} exited with status ${result.status}`,
  )
}
