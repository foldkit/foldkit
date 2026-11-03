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
const output = mkdtempSync(resolve(directory, 'reflection-performance-'))
const cases = process.argv.slice(2)
const results = []
const workspaceBudget = JSON.parse(
  readFileSync(resolve(core, 'type-performance/budgets.json'), 'utf8'),
).fixtures['workspace-composition-8']
const savedOriginalOrder = resolve(
  directory,
  'overloads-flqcmo/baseline/package/dist/block/bindChild.d.ts',
)

for (const name of cases.length === 0
  ? ['current', 'inline-rule-contract']
  : cases) {
  const root = resolve(output, name)
  const target = resolve(root, 'package')
  mkdirSync(target, { recursive: true })
  for (const file of [
    'dist',
    'package.json',
    'type-performance',
    'declaration-tests',
  ])
    cpSync(resolve(core, file), resolve(target, file), { recursive: true })
  mkdirSync(resolve(target, 'node_modules'))
  for (const dependency of ['effect', 'parse5'])
    symlinkSync(
      realpathSync(resolve(core, 'node_modules', dependency)),
      resolve(target, 'node_modules', dependency),
    )
  if (['original-order', 'descriptor-default-last'].includes(name))
    cpSync(savedOriginalOrder, resolve(target, 'dist/block/bindChild.d.ts'))
  const old = resolve(savedOriginalOrder, '../..')
  if (name === 'without-subscription-name')
    cpSync(
      resolve(old, 'block/public.d.ts'),
      resolve(target, 'dist/block/public.d.ts'),
    )
  if (name === 'without-program-name') {
    for (const file of ['program.d.ts', 'programPublic.d.ts'])
      cpSync(
        resolve(old, 'runtime', file),
        resolve(target, 'dist/runtime', file),
      )
  }
  if (name === 'without-field-rule-names')
    cpSync(
      resolve(old, 'fieldValidation/public.d.ts'),
      resolve(target, 'dist/fieldValidation/public.d.ts'),
    )
  if (name === 'old-with-field-rule-names') {
    cpSync(old, resolve(target, 'dist'), { recursive: true })
    cpSync(
      resolve(core, 'dist/fieldValidation/public.d.ts'),
      resolve(target, 'dist/fieldValidation/public.d.ts'),
    )
  }
  if (name === 'light-rule-contract') {
    const contracts =
      "import type { Predicate } from 'effect';\nexport type RuleMessage<A> = string | ((value: A) => string);\nexport type Rule<A> = readonly [Predicate.Predicate<A>, RuleMessage<A>];\n"
    writeFileSync(
      resolve(target, 'dist/fieldValidation/ruleContract.d.ts'),
      contracts,
    )
    const file = resolve(target, 'dist/fieldValidation/rule.d.ts')
    let text = readFileSync(file, 'utf8')
    for (const declaration of [
      'export type RuleMessage<A> = string | ((value: A) => string);',
      'export type Rule<A> = readonly [Predicate.Predicate<A>, RuleMessage<A>];',
    ]) {
      assert(text.includes(declaration))
      text = text.replace(declaration, '')
    }
    text =
      "import type { Rule, RuleMessage } from './ruleContract.js';\nexport type { Rule, RuleMessage } from './ruleContract.js';\n" +
      text
    writeFileSync(file, text)
    const publicFile = resolve(target, 'dist/fieldValidation/public.d.ts')
    const publicTypes =
      "export type { Rule as FieldRule, RuleMessage } from './rule.js';"
    const original = readFileSync(publicFile, 'utf8')
    assert(original.includes(publicTypes))
    writeFileSync(
      publicFile,
      original.replace(
        publicTypes,
        "export type { Rule as FieldRule, RuleMessage } from './ruleContract.js';",
      ),
    )
  }
  if (name === 'public-via-rule-module') {
    const file = resolve(target, 'dist/fieldValidation/public.d.ts')
    const original = readFileSync(file, 'utf8')
    assert(original.includes("from './ruleContract.js'"))
    writeFileSync(
      file,
      original.replace("from './ruleContract.js'", "from './rule.js'"),
    )
  }
  if (name === 'inline-rule-contract') {
    const file = resolve(target, 'dist/fieldValidation/rule.d.ts')
    let text = readFileSync(file, 'utf8')
    const importTypes =
      "import type { Rule, RuleMessage } from './ruleContract.js';\n"
    const exportTypes =
      "export type { Rule, RuleMessage } from './ruleContract.js';\n"
    assert(text.includes(importTypes) && text.includes(exportTypes))
    text = text
      .replace(importTypes, '')
      .replace(exportTypes, '')
      .replace(
        "import { Schema } from 'effect';",
        "import { Predicate, Schema } from 'effect';",
      )
    const contracts =
      'export type RuleMessage<A> = string | ((value: A) => string);\nexport type Rule<A> = readonly [Predicate.Predicate<A>, RuleMessage<A>];\n'
    text = text.replace(
      "import { Predicate, Schema } from 'effect';\n",
      "import { Predicate, Schema } from 'effect';\n" + contracts,
    )
    writeFileSync(file, text)
    const publicFile = resolve(target, 'dist/fieldValidation/public.d.ts')
    const original = readFileSync(publicFile, 'utf8')
    assert(original.includes("from './ruleContract.js'"))
    writeFileSync(
      publicFile,
      original.replace("from './ruleContract.js'", "from './rule.js'"),
    )
  }
  if (name === 'lastgood-all')
    cpSync(old, resolve(target, 'dist'), { recursive: true })
  if (name === 'descriptor-default-last') {
    const file = resolve(target, 'dist/experimental/constructed/authoring.d.ts')
    let text = readFileSync(file, 'utf8')
    text =
      "import type { DefaultViewTypeId } from '../../block/defaultView.js';\n" +
      text
    text = text.replace(
      "import type { AnyBinding } from '../../block/binding.js';",
      "import type { AnyBinding, BindingRequirement } from '../../block/binding.js';",
    )
    const start = text.indexOf('export interface DescriptorViewExtension<')
    const end = text.indexOf('/** Creates passive child Bindings', start)
    const body = text.slice(start, end)
    const original =
      "BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['key']>;"
    assert(body.includes(original))
    const defaultView =
      "BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['key']> & (CoreContract<Child> extends Readonly<{ [DefaultViewTypeId]: infer View extends AnyBlockView }> ? DescriptorDefaultEmbedView<View, BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['parentMessage'], [BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['key']] extends [never] ? BindingRequirement<PlacementOfConfig<CoreContract<Child>, Source>, CoreContract<Child>> : BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['requirements'], BindingViewContract<CoreContract<Child>, ModelSchema, MessageSchema, Source>['key']> : unknown);"
    text =
      text.slice(0, start) +
      body.replace(original, defaultView) +
      text.slice(end)
    text +=
      "\nexport interface DescriptorDefaultEmbedView<View extends AnyBlockView, ParentMessage, Requirements, Key> { (config: Omit<BoundBlockFields<View, ParentMessage>, 'toParentMessage' | 'view'> & Readonly<{ view?: View }> & ([Key] extends [never] ? unknown : Readonly<{ key: Key }>)): BoundBlockConfig<BoundBlockView<View, Requirements>, ParentMessage>; }\n"
    writeFileSync(file, text)
    const publicFile = resolve(target, 'dist/block/public.d.ts')
    writeFileSync(
      publicFile,
      readFileSync(publicFile, 'utf8') +
        "\nexport type { DescriptorDefaultEmbedView } from '../experimental/constructed/authoring.js';\n",
    )
  }
  const measurements = {}
  for (const fixture of [
    'baseline',
    'machine-search',
    'workspace-composition-8',
  ]) {
    const config = resolve(root, fixture + '.json')
    writeFileSync(
      config,
      JSON.stringify(
        {
          extends: resolve(target, 'type-performance/tsconfig.json'),
          files: [resolve(target, 'type-performance', fixture + '.ts')],
          include: [],
          compilerOptions: {
            noEmit: true,
            incremental: false,
            composite: false,
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
        '--extendedDiagnostics',
        '--pretty',
        'false',
      ],
      { cwd: target, encoding: 'utf8', timeout: 180000 },
    )
    const text = (child.stdout ?? '') + (child.stderr ?? '')
    writeFileSync(resolve(root, fixture + '.log'), text)
    assert.equal(child.status, 0, text)
    measurements[fixture] = Object.fromEntries(
      ['Instantiations', 'Types'].map(metric => [
        metric,
        Number(text.match(new RegExp(`^${metric}:\\s+(\\d+)$`, 'm'))?.[1]),
      ]),
    )
  }
  const delta = fixture =>
    Object.fromEntries(
      ['Instantiations', 'Types'].map(metric => [
        metric,
        measurements[fixture][metric] - measurements.baseline[metric],
      ]),
    )
  const summary = {
    name,
    machine: delta('machine-search'),
    workspace: delta('workspace-composition-8'),
  }
  if (name === 'current') {
    assert(summary.workspace.Types <= workspaceBudget.maxTypesDelta)
    assert(
      summary.workspace.Instantiations <=
        workspaceBudget.maxInstantiationsDelta,
    )
  }
  if (name === 'inline-rule-contract') {
    assert(summary.workspace.Types > workspaceBudget.maxTypesDelta)
  }
  results.push(summary)
  process.stdout.write(JSON.stringify(summary) + '\n')
}

writeFileSync(
  resolve(output, 'results.json'),
  JSON.stringify(results, null, 2) + '\n',
)
process.stdout.write(output + '\n')
