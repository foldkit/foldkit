import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from '../../../node_modules/typescript/lib/typescript.js'

const fixture = dirname(fileURLToPath(import.meta.url))
const repository = resolve(fixture, '../../..')
assert(process.argv[2], 'Pass the emission verification directory')
const emission = resolve(process.argv[2])
const recorded = JSON.parse(
  readFileSync(join(emission, 'emission-results.json'), 'utf8'),
)
const artifacts = mkdtempSync(join(emission, 'consumer-'))
const compiler = resolve(
  repository,
  'packages/foldkit/node_modules/typescript/bin/tsc',
)
const relocated = join(artifacts, 'relocated')
const declarations = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory()
      ? declarations(join(directory, entry.name))
      : entry.name.endsWith('.d.ts')
        ? [join(directory, entry.name)]
        : [],
  )
const packagePaths = [
  'foldkit',
  'ui',
  'devtools',
  'markdown',
  'vite-plugin-foldkit',
]
const packages = packagePaths.map(directory => ({
  source: join(repository, 'packages', directory),
  destination: join(relocated, 'packages', directory),
}))
const results = {
  emission,
  artifacts,
  skipLibCheck: false,
  wholeProjectStatus: recorded.status,
  publicRootStatus: 'pending',
  mutationControlStatus: 'pending',
  apps: [],
  checks: [],
  status: 'pending',
}
mkdirSync(join(relocated, 'node_modules'), { recursive: true })
writeFileSync(
  join(relocated, 'package.json'),
  '{"private":true,"type":"module"}\n',
)
const linked = new Set()
function link(name, target) {
  if (linked.has(name)) {
    return
  }
  mkdirSync(dirname(join(relocated, 'node_modules', name)), { recursive: true })
  symlinkSync(target, join(relocated, 'node_modules', name))
  linked.add(name)
}
for (const item of packages) {
  const manifest = JSON.parse(
    readFileSync(join(item.source, 'package.json'), 'utf8'),
  )
  mkdirSync(item.destination, { recursive: true })
  cpSync(join(item.source, 'dist'), join(item.destination, 'dist'), {
    recursive: true,
  })
  cpSync(
    join(item.source, 'package.json'),
    join(item.destination, 'package.json'),
  )
  assert.equal(existsSync(join(item.destination, 'src')), false)
  link(manifest.name, item.destination)
}
for (const directory of [
  ...packages.map(item => item.source),
  ...recorded.apps.map(app => join(repository, app.directory)),
]) {
  const manifest = JSON.parse(
    readFileSync(join(directory, 'package.json'), 'utf8'),
  )
  for (const name of [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]) {
    const target = join(directory, 'node_modules', name)
    if (!linked.has(name) && existsSync(target))
      link(name, realpathSync(target))
  }
}
link('@types', realpathSync(join(repository, 'node_modules/@types')))
const base = JSON.parse(
  readFileSync(join(repository, 'tsconfig.base.json'), 'utf8'),
)
function check(name, config, expected = 0, pattern) {
  const result = spawnSync(
    process.execPath,
    [compiler, '-p', config, '--pretty', 'false'],
    { cwd: relocated, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  writeFileSync(join(artifacts, name + '.log'), output)
  results.checks.push({
    name,
    status: result.status,
    command: [process.execPath, compiler, '-p', config, '--pretty', 'false'],
  })
  if (expected === 0) assert.equal(result.status, 0, name + '\n' + output)
  else assert.notEqual(result.status, 0, name + ' unexpectedly passed')
  if (pattern) assert.match(output, pattern)
}
try {
  const apps = []
  for (const app of recorded.apps) {
    const source = join(emission, app.name, 'emitted')
    const files = declarations(source)
    const root = join(source, app.directory, 'src/block.d.ts')
    const result = {
      name: app.name,
      emissionStatus: app.status,
      declarations: files.length,
      declarationBytes: files.reduce(
        (total, file) => total + readFileSync(file).byteLength,
        0,
      ),
      rootHeaderBytes: existsSync(root) ? readFileSync(root).byteLength : null,
      scope:
        app.status === 0
          ? 'whole-project'
          : 'partial output from failed emission',
    }
    results.apps.push(result)
    if (!existsSync(root)) {
      result.consumer = 'not runnable: root declaration not emitted'
      continue
    }
    const destination = join(relocated, 'apps', app.name)
    cpSync(source, destination, { recursive: true })
    assert.equal(declarations(destination).length, files.length)
    const relativeRoot = './apps/' + app.name + '/' + app.directory + '/src'
    const external = join(relocated, app.name + '.test-d.ts')
    const common = `import {Effect,Layer} from 'effect'\nimport type * as Block from 'foldkit/block'\nimport {ApplicationBlock} from '${relativeRoot}/block.js'\ntype IsAny<Value> = 0 extends 1 & Value ? true : false\ntype Equal<First,Second> = [First] extends [Second] ? [Second] extends [First] ? true : false : false\nexport const exactRoot: IsAny<typeof ApplicationBlock> = false\nexport type Model = typeof ApplicationBlock.Model.Type\nexport type Facts = Block.FactsOf<typeof ApplicationBlock>\nexport type Executable = Block.ExecutableOf<typeof ApplicationBlock>\nexport const noConstructionServices: Equal<Layer.Services<typeof ApplicationBlock.layer>,never> = true\nexport const acquire = ApplicationBlock.get.pipe(Effect.provide(ApplicationBlock.layer))\n`
    const compositionFile =
      app.name === 'website' ? 'composition/composition' : 'composition'
    const updateFile =
      app.name === 'job-application' ? 'update' : 'update/update'
    const portable = `import {ApplicationComposition} from '${relativeRoot}/${compositionFile}.js'\nimport {init} from '${relativeRoot}/init.js'\nimport {update} from '${relativeRoot}/${updateFile}.js'\nimport {view} from '${relativeRoot}/view/view.js'\ntype PlanOutput<Value> = Value extends Block.Plan<infer Output> ? Output : never\ntype AuthoredUpdate = PlanOutput<typeof update>\ntype AuthoredInit = PlanOutput<typeof init>\nexport const exactComposition: IsAny<typeof ApplicationComposition> = false\nexport const exactUpdatePlanValue: IsAny<typeof update> = false\nexport const exactUpdatePlan: IsAny<AuthoredUpdate> = false\nexport const exactInitPlan: IsAny<AuthoredInit> = false\nexport const exactViewPlan: IsAny<typeof view> = false\nexport const updateModel: Equal<Parameters<AuthoredUpdate>[0],Model> = true\nexport const viewModel: Equal<Parameters<typeof view>[0],Model> = true\nexport const startupInputs: Equal<Parameters<AuthoredInit>,Parameters<Executable['init']>> = true\n// @ts-expect-error The authored update retains its exact parent Model.\nexport const invalidUpdateModel:Parameters<AuthoredUpdate>[0] = {unexpected:true}\n`
    const specific =
      app.name === 'job-application'
        ? `import type {SecureRandom} from 'effect/crypto'\nexport const requirements: Equal<Facts['programRequirements'],SecureRandom.SecureRandom> = true\nexport const firstName = (model:Model):string => model.personalInfo.firstName.value\nexport const preview = (model:Model):boolean => model.isPreviewVisible\nexport const submitted = ApplicationBlock.Message.FailedSubmitApplication({error:'offline'})\n// @ts-expect-error Command failure payload remains a String.\nApplicationBlock.Message.FailedSubmitApplication({error:404})\nexport const initialize = (block:Executable) => block.init({today:{year:2026,month:11,day:1},initialWorkHistoryEntryId:'work',initialEducationEntryId:'education',initialSkillsEntryId:'skill'})\n// @ts-expect-error Startup retains the declared Flags contract.\nexport const invalidInitialize = (block:Executable) => block.init({today:'wrong'})\n// @ts-expect-error The deeply nested child field remains String.\nexport const invalidName:Model['personalInfo']['firstName']['value'] = 404\n`
        : app.name === 'workspace'
          ? `import type {WorkspaceRepository} from '${relativeRoot}/repository/repository.js'\nexport const requirements:Equal<Facts['programRequirements'],WorkspaceRepository> = true\nexport const activeMember = (model:Model):string => model.activeMemberId\nexport const draftTitle = (model:Model):string|undefined => model.issueDetails['issue-101']?.draft.title\nexport const deleted = ApplicationBlock.Message.ClickedDeleteSavedView({viewId:'mine'})\n// @ts-expect-error Local Message payload remains a String.\nApplicationBlock.Message.ClickedDeleteSavedView({viewId:404})\n// @ts-expect-error Numeric Model fields remain precise.\nexport const invalidTick:Model['activityTick'] = 'wrong'\n// @ts-expect-error Startup requires an actual Url.\nexport const invalidInitialize = (block:Executable) => block.init('wrong')\n`
          : `import type {LocalStorage,SessionStorage} from '${relativeRoot}/storage.js'\nimport type {PagefindService} from '${relativeRoot}/pagefind.js'\nexport const requirements:Equal<Facts['programRequirements'],LocalStorage|SessionStorage|PagefindService> = true\nexport const email = (model:Model):string => model.newsletterEmail\nexport const searchQuery = (model:Model):string => model.search.query\nexport const changed = ApplicationBlock.Message.UpdatedNewsletterEmail({value:'hello@example.com'})\n// @ts-expect-error Local Message payload remains a String.\nApplicationBlock.Message.UpdatedNewsletterEmail({value:404})\n// @ts-expect-error Boolean Model fields remain precise.\nexport const invalidViewport:Model['isNarrowViewport'] = 'wrong'\n// @ts-expect-error Startup preserves both Flags and Url.\nexport const invalidInitialize = (block:Executable) => block.init('wrong')\n`
    writeFileSync(external, common + portable + specific)
    const config = join(artifacts, app.name + '-consumer.json')
    writeFileSync(
      config,
      JSON.stringify(
        {
          compilerOptions: {
            ...base.compilerOptions,
            noEmit: true,
            module: 'ESNext',
            moduleResolution: 'bundler',
            skipLibCheck: false,
            types: ['node'],
          },
          files: [external],
        },
        null,
        2,
      ) + '\n',
    )
    apps.push({
      app,
      root: join(destination, app.directory, 'src/block.d.ts'),
      intermediate: [
        {
          file: join(
            destination,
            app.directory,
            'src',
            compositionFile + '.d.ts',
          ),
          name: 'ApplicationComposition',
        },
        {
          file: join(destination, app.directory, 'src', updateFile + '.d.ts'),
          name: 'update',
        },
        {
          file: join(destination, app.directory, 'src/view/view.d.ts'),
          name: 'view',
        },
      ],
      config,
      result,
    })
    check(app.name + '-consumer', config)
    const listed = spawnSync(
      process.execPath,
      [compiler, '-p', config, '--listFilesOnly'],
      { cwd: relocated, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
    )
    const fileList = (listed.stdout ?? '') + (listed.stderr ?? '')
    writeFileSync(join(artifacts, app.name + '-resolved-files.log'), fileList)
    assert.equal(listed.status, 0, fileList)
    const forbidden = [
      ...recorded.apps.map(item => join(repository, item.directory, 'src')),
      ...packages.map(item => item.source),
    ]
    const filesRead = fileList.split('\n').filter(Boolean)
    for (const file of filesRead) {
      assert.equal(
        forbidden.some(directory => file.startsWith(directory + '/')),
        false,
        'Consumer reached original app/framework files: ' + file,
      )
    }
    result.resolvedFiles = filesRead.length
    result.originalAppAndFrameworkFilesRead = 0
    result.consumer = 'passed'
  }
  const target =
    apps.find(item => item.app.name === 'job-application') ?? apps.at(0)
  assert(target, 'At least one real root must emit before testing its consumer')
  const original = readFileSync(target.root, 'utf8')
  const parsed = ts.createSourceFile(
    'block.d.ts',
    original,
    ts.ScriptTarget.Latest,
    true,
  )
  const declaration = parsed.statements
    .flatMap(statement =>
      ts.isVariableStatement(statement)
        ? [...statement.declarationList.declarations]
        : [],
    )
    .find(
      declaration => declaration.name.getText(parsed) === 'ApplicationBlock',
    )
  assert(
    declaration?.type,
    'Real ApplicationBlock declaration must have its inferred public type',
  )
  const mutated =
    original.slice(0, declaration.type.getStart(parsed)) +
    'any' +
    original.slice(declaration.type.end)
  assert.notEqual(mutated, original)
  writeFileSync(target.root, mutated)
  check('any-root-control', target.config, 1, /TS2322|TS2578/)
  writeFileSync(target.root, original)
  check('restored-root', target.config)
  for (const intermediate of target.intermediate) {
    const original = readFileSync(intermediate.file, 'utf8')
    const parsed = ts.createSourceFile(
      intermediate.file,
      original,
      ts.ScriptTarget.Latest,
      true,
    )
    const declaration = parsed.statements
      .flatMap(statement =>
        ts.isVariableStatement(statement)
          ? [...statement.declarationList.declarations]
          : [],
      )
      .find(
        declaration => declaration.name.getText(parsed) === intermediate.name,
      )
    assert(
      declaration?.type,
      intermediate.name + ' must retain its declared type',
    )
    writeFileSync(
      intermediate.file,
      original.slice(0, declaration.type.getStart(parsed)) +
        'any' +
        original.slice(declaration.type.end),
    )
    check(
      'any-' + intermediate.name + '-control',
      target.config,
      1,
      /TS2322|TS2344|TS2578/,
    )
    writeFileSync(intermediate.file, original)
    check('restored-' + intermediate.name, target.config)
  }
  results.mutationControlStatus = 'passed'
  results.publicRootStatus =
    results.apps.length === 3 &&
    results.apps.every(app => app.consumer === 'passed')
      ? 'passed'
      : 'failed'
  results.status =
    recorded.status === 'passed' && results.publicRootStatus === 'passed'
      ? 'passed'
      : 'failed'
  if (recorded.status !== 'passed' || results.publicRootStatus !== 'passed') {
    process.exitCode = 1
  }
} finally {
  writeFileSync(
    join(artifacts, 'results.json'),
    JSON.stringify(results, null, 2) + '\n',
  )
  process.stdout.write(artifacts + '\n')
}
