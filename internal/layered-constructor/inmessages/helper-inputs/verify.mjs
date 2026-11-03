import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../../..')
const core = join(repository, 'packages/foldkit')
const compiler = join(core, 'node_modules/.bin/tsc')
const fixtures = join(core, 'declaration-tests')
const artifacts = join(directory, 'artifacts')
const results = []
rmSync(artifacts, { recursive: true, force: true })
mkdirSync(artifacts, { recursive: true })

const makeHost = name => {
  const host = join(artifacts, name)
  const modules = join(host, 'node_modules')
  const copied = join(modules, 'foldkit')
  mkdirSync(copied, { recursive: true })
  cpSync(join(core, 'dist'), join(copied, 'dist'), { recursive: true })
  cpSync(join(core, 'package.json'), join(copied, 'package.json'))
  const metadata = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'))
  for (const dependency of Object.keys({
    ...metadata.dependencies,
    ...metadata.peerDependencies,
  })) {
    const installed = join(core, 'node_modules', dependency)
    if (!existsSync(installed)) {
      continue
    }
    const destination = join(modules, dependency)
    mkdirSync(dirname(destination), { recursive: true })
    symlinkSync(installed, destination)
  }
  writeFileSync(
    join(host, 'package.json'),
    '{"private":true,"type":"module"}\n',
  )
  return { host, copied }
}
const fixture = name => `helper-inputs.${name}.ts`
const compile = (name, host, files, output, isExpectedFailure = false) => {
  const [firstFile] = files

  if (firstFile === undefined) {
    throw new Error(`${name}: no input fixtures`)
  }

  const config = join(host, `${name}.json`)
  writeFileSync(
    config,
    JSON.stringify(
      {
        extends: join(repository, 'tsconfig.base.json'),
        compilerOptions: {
          moduleResolution: 'Bundler',
          types: [],
          noEmit: output === undefined,
          declaration: true,
          emitDeclarationOnly: true,
          incremental: false,
          skipLibCheck: false,
          ...(output === undefined
            ? {}
            : { rootDir: dirname(firstFile), outDir: output }),
        },
        files,
        include: [],
      },
      null,
      2,
    ),
  )
  const compiled = spawnSync(compiler, ['-p', config, '--pretty', 'false'], {
    cwd: repository,
    encoding: 'utf8',
  })
  const log = `${compiled.stdout ?? ''}${compiled.stderr ?? ''}`
  writeFileSync(join(artifacts, `${name}.log`), log)
  if ((compiled.status !== 0) !== isExpectedFailure) {
    throw new Error(`${name}: unexpected status ${compiled.status}\n${log}`)
  }
  if (
    isExpectedFailure &&
    /node_modules\/foldkit\/dist\/[^\n]+error TS/.test(log)
  ) {
    throw new Error(
      `${name}: mutation produced invalid library declarations\n${log}`,
    )
  }
  results.push({ name, status: compiled.status, isExpectedFailure })
  console.log(
    `${name}: passed${isExpectedFailure ? ' (mutation rejected)' : ''}`,
  )
}
const baseline = makeHost('baseline')
const source = join(baseline.host, 'source')
mkdirSync(source)
for (const name of ['definition', 'accepted', 'rejected', 'consume']) {
  cpSync(join(fixtures, fixture(name)), join(source, fixture(name)))
}
compile('public-source', baseline.host, [
  join(source, fixture('accepted')),
  join(source, fixture('rejected')),
  join(source, fixture('consume')),
])
const emitted = join(baseline.host, 'emitted')
compile(
  'emit',
  baseline.host,
  [join(source, fixture('accepted')), join(source, fixture('definition'))],
  emitted,
)
const relocated = makeHost('relocated')
const relocatedFiles = join(relocated.host, 'declarations')
cpSync(emitted, relocatedFiles, { recursive: true })
for (const name of ['rejected', 'consume']) {
  cpSync(join(source, fixture(name)), join(relocatedFiles, fixture(name)))
}
compile('relocated', relocated.host, [
  join(relocatedFiles, fixture('rejected')),
  join(relocatedFiles, fixture('consume')),
])

const mutate = (name, relative, before, after) => {
  const variant = makeHost(name)
  const target = join(variant.copied, 'dist', relative)
  const original = readFileSync(target, 'utf8')
  if (!original.includes(before)) {
    throw new Error(`${name}: mutation target absent`)
  }
  writeFileSync(target, original.replace(before, after))
  const variantSource = join(variant.host, 'source')
  cpSync(source, variantSource, { recursive: true })
  compile(
    name,
    variant.host,
    [
      join(variantSource, fixture('accepted')),
      join(variantSource, fixture('rejected')),
    ],
    undefined,
    true,
  )
}
mutate(
  'input-union-ignored',
  'block/commandsStep.d.ts',
  ': FocusedMakeCommandsStep<Model, Message, InputMessage>;',
  ': FocusedMakeCommandsStep<Model, Message, Message>;',
)
mutate(
  'output-union-widened',
  'block/commandsStep.d.ts',
  'const Producer extends ContextualModelMessageProducer<Model, ExactMessage, Update.Commands<Message, any>>',
  'const Producer extends ContextualModelMessageProducer<Model, ExactMessage, Update.Commands<Message | InputMessage, any>>',
)
mutate(
  'overlap-selection-lost',
  'block/focusedStep.d.ts',
  'Extract<Extract<Extract<OwnerMessage, Readonly<{\n    _tag: Tag;\n}>>, ExactMessage>, DeclaredMessage>',
  'Extract<Extract<OwnerMessage, Readonly<{\n    _tag: Tag;\n}>>, ExactMessage>',
)
writeFileSync(
  join(artifacts, 'results.json'),
  `${JSON.stringify(results, null, 2)}\n`,
)
console.log(`${results.length}/${results.length} helper input checks passed`)
