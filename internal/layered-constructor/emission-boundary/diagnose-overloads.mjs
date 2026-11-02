import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const output = mkdtempSync(resolve(directory, 'overloads-'))
const manifest = JSON.parse(readFileSync(resolve(core, 'package.json'), 'utf8'))
const results = []

for (const name of ['baseline', 'reversed-order']) {
  const root = resolve(output, name)
  const target = resolve(root, 'package')
  mkdirSync(target, { recursive: true })
  cpSync(resolve(core, 'dist'), resolve(target, 'dist'), { recursive: true })
  cpSync(resolve(core, 'package.json'), resolve(target, 'package.json'))
  mkdirSync(resolve(target, 'node_modules'))
  for (const dependency of ['effect', 'parse5']) {
    symlinkSync(
      realpathSync(resolve(core, 'node_modules', dependency)),
      resolve(target, 'node_modules', dependency),
    )
  }
  if (name === 'reversed-order') {
    const file = resolve(target, 'dist/block/bindChild.d.ts')
    let text = readFileSync(file, 'utf8')
    const prefix =
      /export type (SelectedChildBinding|BindingWithoutOutMessagePolicy)(<[^\n]+>) = Extra & BindChildResultForConfig/g
    assert.equal([...text.matchAll(prefix)].length, 2)
    text = text.replace(prefix, 'export type $1$2 = BindChildResultForConfig')
    const policyExtra =
      /& BindingStorageEvidence<StorageOfConfig<Config>> & Readonly/g
    assert.equal([...text.matchAll(policyExtra)].length, 2)
    text = text.replace(
      policyExtra,
      '& BindingStorageEvidence<StorageOfConfig<Config>> & Extra & Readonly',
    )
    const original =
      ': Extra & BindChildResultForConfig<BlockValue, ParentModelSchema, ParentMessageSchema, ParentOutMessageSchema, Config, ChildInitContext> & BindingStorageEvidence<StorageOfConfig<Config>>;'
    assert(text.includes(original))
    text = text.replace(
      original,
      ': BindChildResultForConfig<BlockValue, ParentModelSchema, ParentMessageSchema, ParentOutMessageSchema, Config, ChildInitContext> & BindingStorageEvidence<StorageOfConfig<Config>> & Extra;',
    )
    writeFileSync(file, text)
  }
  const paths = Object.fromEntries(
    Object.entries(manifest.exports).map(([name, value]) => [
      name === '.' ? 'foldkit' : 'foldkit/' + name.slice(2),
      [resolve(target, value.types)],
    ]),
  )
  const config = resolve(root, 'tsconfig.json')
  writeFileSync(
    config,
    JSON.stringify(
      {
        extends: resolve(repository, 'packages/website/tsconfig.json'),
        compilerOptions: { paths, noEmit: true },
      },
      null,
      2,
    ),
  )
  const child = spawnSync(
    process.execPath,
    [
      resolve(core, 'node_modules/typescript/bin/tsc'),
      '-p',
      config,
      '--pretty',
      'false',
    ],
    { cwd: repository, encoding: 'utf8' },
  )
  writeFileSync(
    resolve(root, 'source.log'),
    (child.stdout ?? '') + (child.stderr ?? ''),
  )
  assert.equal(child.status, name === 'baseline' ? 0 : 2)
  if (name === 'reversed-order') {
    assert.match(child.stdout, /popover.ts/)
    assert.match(child.stdout, /snippetCopyRenderer.ts/)
    assert.match(child.stdout, /snippetDisclosureRenderer.ts/)
  }
  results.push({ name, status: child.status, config })
  process.stdout.write(JSON.stringify(results.at(-1)) + '\n')
}

writeFileSync(
  resolve(output, 'results.json'),
  JSON.stringify(results, null, 2) + '\n',
)
process.stdout.write(output + '\n')
