import { Array, Option, pipe } from 'effect'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { collectPackageTypes } from './playgroundTypesPlugin'

const fixtureRoots: Array<string> = []

const makePackage = async (
  files: Readonly<Record<string, string>>,
): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'foldkit-playground-types-'))
  fixtureRoots.push(root)

  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const destination = join(root, path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, contents)
    }),
  )

  return root
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots.splice(0).map(root => rm(root, { recursive: true })),
  )
})

describe('collectPackageTypes', () => {
  it('keeps package declarations without following nested dependencies or symlinks', async () => {
    const root = await makePackage({
      'package.json': JSON.stringify({
        types: './index.d.ts',
        exports: { '.': { types: './index.d.ts' } },
      }),
      'index.d.ts': "export type { Item } from './internal/item.js'\n",
      'internal/item.d.ts': 'export type Item = { title: string }\n',
      'node_modules/private-dependency/index.d.ts':
        'declare const privateAmbient: unknown\n',
      'internal/node_modules/private-dependency/index.d.ts':
        'declare const nestedAmbient: unknown\n',
    })
    await symlink(root, join(root, 'cycle'), 'dir')
    await symlink(root, join(root, 'node_modules', 'package-cycle'), 'dir')

    const files = await collectPackageTypes(root, 'fixture')
    expect(Array.map(files, ({ path }) => path).sort()).toEqual([
      '/node_modules/fixture/index.d.ts',
      '/node_modules/fixture/internal/item.d.ts',
    ])
    expect(
      pipe(
        files,
        Array.findFirst(
          ({ path }) => path === '/node_modules/fixture/index.d.ts',
        ),
        Option.map(({ contents }) => contents),
      ),
    ).toEqual(Option.some("export type { Item } from './internal/item.js'\n"))
  })

  it('deduplicates overlapping root and dist exports while preserving public barrels', async () => {
    const root = await makePackage({
      'package.json': JSON.stringify({
        exports: {
          '.': { types: './dist/index.d.ts' },
          './content': { types: './content.d.ts' },
        },
      }),
      'dist/index.d.ts': 'export default function render(): void\n',
      'content.d.ts': "declare module '*.md' {}\n",
      'node_modules/private-dependency/index.d.ts':
        'export type Hidden = never\n',
    })

    const files = await collectPackageTypes(root, 'fixture')
    const paths = Array.map(files, ({ path }) => path)
    expect(paths).toHaveLength(new Set(paths).size)
    expect(paths.sort()).toEqual([
      '/node_modules/fixture/content.d.ts',
      '/node_modules/fixture/content/index.d.ts',
      '/node_modules/fixture/dist/index.d.ts',
      '/node_modules/fixture/index.d.ts',
    ])
    expect(
      pipe(
        files,
        Array.findFirst(
          ({ path }) => path === '/node_modules/fixture/index.d.ts',
        ),
        Option.map(({ contents }) => contents),
      ),
    ).toEqual(
      Option.some(
        "export * from './dist/index.js'\nexport { default } from './dist/index.js'\n",
      ),
    )
  })

  it('retains export-equals declarations at a legacy package entry', async () => {
    const contents = 'declare function merge(): string\nexport = merge\n'
    const root = await makePackage({
      'package.json': JSON.stringify({ types: './merge.d.ts' }),
      'merge.d.ts': contents,
    })

    const files = await collectPackageTypes(root, 'fixture')
    expect(
      pipe(
        files,
        Array.findFirst(
          ({ path }) => path === '/node_modules/fixture/index.d.ts',
        ),
        Option.map(({ contents }) => contents),
      ),
    ).toEqual(Option.some(contents))
  })
})
