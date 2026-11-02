import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = resolve(repository, 'packages/foldkit')
const require = createRequire(resolve(core, 'package.json'))
const ts = require(
  resolve(
    repository,
    'node_modules/.pnpm/typescript@6.0.3/node_modules/typescript',
  ),
)
const output = mkdtempSync(resolve(directory, 'boundaries-'))
const manifest = JSON.parse(readFileSync(resolve(core, 'package.json'), 'utf8'))
const cases = process.argv.slice(2)
const results = []

for (const name of cases.length === 0
  ? ['baseline', 'named-extensions']
  : cases) {
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
  if (name === 'named-extensions' || name === 'named-bindings') {
    const file = resolve(target, 'dist/experimental/constructed/authoring.d.ts')
    let text = readFileSync(file, 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const replacements = []
    let extension
    for (const statement of source.statements) {
      if (
        !ts.isInterfaceDeclaration(statement) ||
        !['MakeBinding', 'MakeMapBinding'].includes(statement.name.text)
      )
        continue
      for (const member of statement.members) {
        if (
          !ts.isCallSignatureDeclaration(member) ||
          !ts.isTypeReferenceNode(member.type)
        )
          continue
        const args = member.type.typeArguments
        assert.equal(args.length, 7)
        const config = args[4].getText(source)
        extension ??= args[6].getText(source)
        replacements.push({
          start: args[6].getStart(source),
          end: args[6].end,
          replacement: `DescriptorBindingExtension<Child, ModelSchema, MessageSchema, ${config}, Kind, ParentOwner>`,
        })
      }
    }
    assert.equal(replacements.length, 4)
    for (const change of replacements.reverse())
      text =
        text.slice(0, change.start) +
        change.replacement +
        text.slice(change.end)
    text += `\nexport type DescriptorBindingExtension<Child extends AnyDescriptor, ModelSchema extends AnySchema, MessageSchema extends AnySchema, Source, Kind extends ConstructionKind, ParentOwner> = ${extension};\n`
    if (name === 'named-bindings') {
      const next = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
      const returns = []
      for (const statement of next.statements) {
        if (
          !ts.isInterfaceDeclaration(statement) ||
          !['MakeBinding', 'MakeMapBinding'].includes(statement.name.text)
        )
          continue
        for (const member of statement.members) {
          if (
            !ts.isCallSignatureDeclaration(member) ||
            !ts.isTypeReferenceNode(member.type)
          )
            continue
          const args = member.type.typeArguments
          const config = args[4].getText(next)
          returns.push({
            start: member.type.getStart(next),
            end: member.type.end,
            replacement: `DescriptorBinding<Child, ModelSchema, MessageSchema, OutMessageSchema, ${config}, ChildInitContextSchema, Kind, ParentOwner>`,
          })
        }
      }
      assert.equal(returns.length, 4)
      for (const change of returns.reverse())
        text =
          text.slice(0, change.start) +
          change.replacement +
          text.slice(change.end)
      text +=
        '\nexport type DescriptorBinding<Child extends AnyDescriptor, ModelSchema extends AnySchema, MessageSchema extends AnySchema, OutMessageSchema extends AnySchema | undefined, Source, ChildInitContextSchema extends AnySchema | undefined, Kind extends ConstructionKind, ParentOwner> = BindChildConstructorResult<CoreContract<Child>, ModelSchema, MessageSchema, OutMessageSchema, Source, ChildContext<ChildInitContextSchema>, DescriptorBindingExtension<Child, ModelSchema, MessageSchema, Source, Kind, ParentOwner>>;\n'
    }
    writeFileSync(file, text)
    const publicFile = resolve(target, 'dist/block/public.d.ts')
    const exported =
      name === 'named-bindings'
        ? 'DescriptorBindingExtension, DescriptorBinding'
        : 'DescriptorBindingExtension'
    writeFileSync(
      publicFile,
      readFileSync(publicFile, 'utf8') +
        `\nexport type { ${exported} } from '../experimental/constructed/authoring.js';\n`,
    )
  }
  if (name === 'flat-source') {
    const file = resolve(target, 'dist/experimental/constructed/authoring.d.ts')
    let text = readFileSync(file, 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const declaration = source.statements.find(
      statement =>
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === 'StaticSource',
    )
    assert(declaration)
    const arguments_ =
      'OwnerValue, ModelSchema, MessageSchema, OutMessageSchema, Mounts, Bindings'
    const fields = `
export interface StaticSourceFields<OwnerValue extends Owner<string>, ModelSchema extends AnySchema, MessageSchema extends AnySchema, OutMessageSchema extends AnySchema | undefined, Mounts extends ReadonlyArray<Mount.LayeredMountDefinition>, Bindings extends ReadonlyArray<AnyBinding>> {
  readonly owner: OwnerValue;
  readonly Model: ModelSchema;
  readonly Message: Composition<${arguments_}>['Message'];
  readonly mounts: Composition<${arguments_}>['mounts'];
  readonly [LocalMountsTypeId]: Mounts;
  readonly bindings: Bindings;
}
`
    const replacement = `StaticSourceFields<${arguments_}> & SourceContracts<MessageSchema, OutMessageSchema> & (OutMessageSchema extends AnySchema ? Readonly<{ OutMessage: OutMessageSchema }> : Readonly<{ OutMessage?: never }>)`
    text =
      text.slice(0, declaration.type.getStart(source)) +
      replacement +
      text.slice(declaration.type.end) +
      fields
    writeFileSync(file, text)
    const publicFile = resolve(target, 'dist/block/public.d.ts')
    writeFileSync(
      publicFile,
      readFileSync(publicFile, 'utf8') +
        "\nexport type { StaticSourceFields } from '../experimental/constructed/authoring.js';\n",
    )
  }
  const paths = Object.fromEntries(
    Object.entries(manifest.exports).map(([name, value]) => [
      name === '.' ? 'foldkit' : 'foldkit/' + name.slice(2),
      [resolve(target, value.types)],
    ]),
  )
  for (const [app, appDirectory] of [
    ['workspace', 'examples/workspace'],
    ['website', 'packages/website'],
    ['job-application', 'examples/job-application'],
  ]) {
    if (process.env.FOLDKIT_DIAG_APP && app !== process.env.FOLDKIT_DIAG_APP)
      continue
    const config = resolve(root, app + '.json')
    const outDir = resolve(root, app, 'emitted')
    writeFileSync(
      config,
      JSON.stringify(
        {
          extends: resolve(repository, appDirectory, 'tsconfig.json'),
          compilerOptions: {
            paths,
            noEmit: false,
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: true,
            incremental: false,
            composite: false,
            rootDir: repository,
            outDir,
          },
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
    const log = (child.stdout ?? '') + (child.stderr ?? '')
    writeFileSync(resolve(root, app + '.log'), log)
    const rootHeader = resolve(outDir, appDirectory, 'src/block.d.ts')
    const result = {
      name,
      app,
      status: child.status,
      serializationErrors: [...log.matchAll(/TS7056/g)].length,
      portabilityErrors: [...log.matchAll(/TS2883/g)].length,
      headerBytes: existsSync(rootHeader)
        ? readFileSync(rootHeader).byteLength
        : undefined,
      config,
    }
    results.push(result)
    process.stdout.write(JSON.stringify(result) + '\n')
  }
}

writeFileSync(
  resolve(output, 'results.json'),
  JSON.stringify(results, null, 2) + '\n',
)
process.stdout.write(output + '\n')
