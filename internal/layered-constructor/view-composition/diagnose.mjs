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
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = dirname(fileURLToPath(import.meta.url))
const repository = resolve(directory, '../../..')
const core = join(repository, 'packages/foldkit')
const output = mkdtempSync(join(directory, 'diagnosis-'))
const cases = process.argv.slice(2)
const results = []
for (const name of cases.length === 0
  ? [
      'current',
      'no-bound-test-export',
      'no-view-callability',
      'binding-parent-owned-by-core',
    ]
  : cases) {
  const root = join(output, name)
  const target = join(root, 'package')
  mkdirSync(target, { recursive: true })
  for (const file of [
    'dist',
    'package.json',
    'type-performance',
    'declaration-tests',
  ])
    cpSync(join(core, file), join(target, file), { recursive: true })
  mkdirSync(join(target, 'node_modules'), { recursive: true })
  for (const [dependency, source] of [
    ['effect', 'node_modules/effect'],
    ['parse5', 'packages/foldkit/node_modules/parse5'],
  ])
    symlinkSync(
      realpathSync(join(repository, source)),
      join(target, 'node_modules', dependency),
    )
  const edit = (file, change) => {
    const path = join(target, 'dist', file)
    const original = readFileSync(path, 'utf8')
    const changed = change(original)
    assert.notEqual(changed, original, `${name}: ${file}`)
    writeFileSync(path, changed)
  }
  if (name === 'no-bound-test-export')
    edit('test/public.d.ts', text =>
      text.replace(
        /^export .*from '.\/(?:toParentMessageFor|testGraph).js';\n/gm,
        '',
      ),
    )
  if (name === 'no-view-callability')
    edit('experimental/hybrid/authoring.d.ts', text =>
      text.replace(
        "export type ViewPlan<View, Composition = unknown> = Plan<View, 'View', Composition> & View;",
        "export type ViewPlan<View, Composition = unknown> = Plan<View, 'View', Composition>;",
      ),
    )
  if (name === 'binding-parent-owned-by-core') {
    const owner =
      'declare const BindingParentTypeId: unique symbol;\n/** @internal Parent owner evidence. */\nexport interface BindingParent<OwnerValue> { readonly [BindingParentTypeId]: OwnerValue; }\n'
    const path = join(target, 'dist/block/bindingConnection.d.ts')
    writeFileSync(path, readFileSync(path, 'utf8') + '\n' + owner)
    edit('experimental/constructed/authoring.d.ts', text =>
      text
        .replace('declare const BindingParentTypeId: unique symbol;\n', '')
        .replace(
          /\/\*\* @internal Retains the parent owner without exposing its executable graph\. \*\/\nexport interface BindingParent<OwnerValue> \{\n    readonly \[BindingParentTypeId\]: OwnerValue;\n\}/,
          "export type { BindingParent } from '../../block/bindingConnection.js';\nimport type { BindingParent } from '../../block/bindingConnection.js';",
        ),
    )
    edit('test/toParentMessageFor.d.ts', text =>
      text.replace(
        "from '../experimental/constructed/authoring.js'",
        "from '../block/bindingConnection.js'",
      ),
    )
  }
  const old = join(
    repository,
    'internal/layered-constructor/query-production/verification/run-0E550s/package/dist',
  )
  const restoreOld = file => cpSync(join(old, file), join(target, 'dist', file))
  if (name === 'old-query-imports') {
    restoreOld('experimental/query/queryImplementation.d.ts')
    restoreOld('experimental/query/keyedQueryImplementation.d.ts')
  }
  if (name === 'old-view-surface') {
    restoreOld('experimental/hybrid/authoring.d.ts')
    restoreOld('experimental/contracted/contract.d.ts')
    const file = join(target, 'dist/experimental/hybrid/authoring.d.ts')
    writeFileSync(
      file,
      readFileSync(file, 'utf8') +
        "\nexport type ViewPlan<View, Composition = unknown> = Plan<View, 'View', Composition> & View;\n",
    )
  }
  if (name === 'old-scoped-surface') {
    for (const file of [
      'experimental/layered/testing/withBlock.d.ts',
      'experimental/layered/testing/messageIn.d.ts',
      'test/public.d.ts',
    ])
      restoreOld(file)
  }
  if (name === 'old-public-plan-exports') {
    for (const file of [
      'block/public.d.ts',
      'experimental/contracted/public.d.ts',
      'experimental/constructed/public.d.ts',
      'experimental/layered/public.d.ts',
      'experimental/hybrid/public.d.ts',
    ])
      restoreOld(file)
  }
  if (name === 'old-all') {
    cpSync(old, join(target, 'dist'), { recursive: true })
  }
  if (name === 'old-all-other-than-view') {
    for (const file of [
      'experimental/layered/testing/withBlock.d.ts',
      'experimental/layered/testing/messageIn.d.ts',
      'test/public.d.ts',
      'experimental/query/queryImplementation.d.ts',
      'experimental/query/keyedQueryImplementation.d.ts',
      'block/public.d.ts',
      'experimental/contracted/public.d.ts',
      'experimental/constructed/public.d.ts',
      'experimental/layered/public.d.ts',
      'experimental/hybrid/public.d.ts',
    ])
      restoreOld(file)
  }
  if (name === 'old-all-other-than-testing') {
    for (const file of [
      'experimental/hybrid/authoring.d.ts',
      'experimental/contracted/contract.d.ts',
      'experimental/query/queryImplementation.d.ts',
      'experimental/query/keyedQueryImplementation.d.ts',
      'block/public.d.ts',
      'experimental/contracted/public.d.ts',
      'experimental/constructed/public.d.ts',
      'experimental/layered/public.d.ts',
      'experimental/hybrid/public.d.ts',
    ])
      restoreOld(file)
  }
  if (name === 'no-query-key-exports') {
    edit('experimental/query/public.d.ts', text =>
      text.replace(
        /^export type \{ (?:QueryKey|KeyedQueryKey) \} from '.\/(?:queryDefinition|keyedQueryDefinition).js';\n/gm,
        '',
      ),
    )
  }
  if (name === 'query-key-owned-by-identity') {
    const identities =
      'export declare const QueryKey: unique symbol;\nexport declare const KeyedQueryKey: unique symbol;\n'
    writeFileSync(
      join(target, 'dist/experimental/query/identity.d.ts'),
      identities,
    )
    for (const [module, key] of [
      ['queryDefinition', 'QueryKey'],
      ['keyedQueryDefinition', 'KeyedQueryKey'],
    ]) {
      edit('experimental/query/' + module + '.d.ts', text =>
        text.replace(
          'export declare const ' + key + ': unique symbol;',
          'export type { ' +
            key +
            " } from './identity.js';\nimport { " +
            key +
            " } from './identity.js';",
        ),
      )
    }
    edit('experimental/query/public.d.ts', text =>
      text
        .replace(
          "export type { QueryKey } from './queryDefinition.js';",
          "export type { QueryKey } from './identity.js';",
        )
        .replace(
          "export type { KeyedQueryKey } from './keyedQueryDefinition.js';",
          "export type { KeyedQueryKey } from './identity.js';",
        ),
    )
  }
  if (name === 'no-canonical-descriptor') {
    edit('block/public.d.ts', text =>
      text.replace(
        'CoreContract, DescriptorContract, ExecutableOf',
        'CoreContract, ExecutableOf',
      ),
    )
  }
  if (name === 'old-cx-package') {
    cpSync(
      join(
        repository,
        'internal/layered-constructor/query-production/verification/run-CXG0pT/package/dist',
      ),
      join(target, 'dist'),
      { recursive: true },
    )
  }
  if (name === 'named-descriptor-union') {
    edit('experimental/constructed/contract.d.ts', text =>
      text.replace(
        /export type DescriptorContract = DescriptorContracts & \(Readonly<\{\n    construct: \(\) => Effect.Effect<object, any, any>;\n\}> \| Readonly<\{\n    get: Effect.Effect<object, any, any>;\n\}>\);/,
        'interface ConstructibleDescriptorContract extends DescriptorContracts { readonly construct: () => Effect.Effect<object, any, any>; }\ninterface ProvidedDescriptorContract extends DescriptorContracts { readonly get: Effect.Effect<object, any, any>; }\nexport type DescriptorContract = ConstructibleDescriptorContract | ProvidedDescriptorContract;',
      ),
    )
  }
  if (name === 'old-pre-query') {
    cpSync(
      join(
        repository,
        'internal/layered-constructor/block-namespace/verification/run-2x0Ltk/package/dist',
      ),
      join(target, 'dist'),
      { recursive: true },
    )
  }
  if (name === 'old-namespace-family') {
    cpSync(
      join(
        repository,
        'internal/layered-constructor/block-namespace/verification/run-2x0Ltk/package/dist/block/makeNamespace.d.ts',
      ),
      join(target, 'dist/block/makeNamespace.d.ts'),
    )
  }
  if (name === 'old-family-module') {
    cpSync(
      join(
        repository,
        'internal/layered-constructor/block-namespace/verification/run-2x0Ltk/package/dist/experimental/contracted/family.d.ts',
      ),
      join(target, 'dist/experimental/contracted/family.d.ts'),
    )
  }
  if (name === 'old-query-surface') {
    for (const file of [
      'experimental/query/public.d.ts',
      'experimental/query/define.d.ts',
    ])
      cpSync(
        join(
          repository,
          'internal/layered-constructor/block-namespace/verification/run-2x0Ltk/package/dist',
          file,
        ),
        join(target, 'dist', file),
      )
  }
  if (name === 'named-namespace') {
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        /export type Namespace<Id extends string, Concrete extends boolean = true> = Omit<NativeNamespace<Id, Concrete>, 'makeDefinition'> & Readonly<\{\n    makeDefinition: NamespaceMakeDefinition<Id, Concrete>;\n\}> & Readonly<\{\n    makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>;\n\}>;/,
        "export interface Namespace<Id extends string, Concrete extends boolean = true> extends Omit<NativeNamespace<Id, Concrete>, 'makeDefinition'> { readonly makeDefinition: NamespaceMakeDefinition<Id, Concrete>; readonly makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>; }",
      ),
    )
  }
  if (name === 'family-namespace-from-declaration-runtime') {
    const family = readFileSync(
      join(target, 'dist/experimental/contracted/family.d.ts'),
      'utf8',
    )
    const start = family.indexOf(
      'export interface FamilyNamespaceMakeDefinition',
    )
    const end = family.indexOf('/** Declares a specialization', start)
    const declaration = family.slice(start, end)
    const runtime = join(target, 'dist/experimental/contracted/runtime.d.ts')
    writeFileSync(
      runtime,
      readFileSync(runtime, 'utf8') +
        "\nimport type {FamilyDefinition} from './family.js';\n" +
        declaration,
    )
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        "import type { FamilyNamespaceMakeDefinition } from '../experimental/contracted/family.js';",
        "import type { FamilyNamespaceMakeDefinition } from '../experimental/contracted/runtime.js';",
      ),
    )
  }
  if (name === 'named-family-definition') {
    edit('experimental/contracted/family.d.ts', text => {
      const start = text.indexOf('export type FamilyDefinition<')
      const end = text.indexOf('/** A family provider', start)
      const params =
        'Id extends string, ModelSchema extends AnySchema, MessageSchema extends AnySchema, OutMessageSchema extends AnySchema | undefined, ChildInitContextSchema extends AnySchema | undefined, Config extends ContractConfiguration'
      const args =
        'Id, ModelSchema, MessageSchema, OutMessageSchema, ChildInitContextSchema, Config'
      const base = 'Definition<' + args + '>'
      const fields = 'FamilyDefinitionFields<' + args + '>'
      const names = [
        'owner',
        'Model',
        'Message',
        'mounts',
        'bindings',
        'makeStep',
        'makeFieldsStep',
        'makeNoopStep',
        'makeCommandsStep',
        'makeSubscriptions',
        'makeManagedResources',
        'makeBinding',
        'makeMapBinding',
        'makeOutMessageFold',
        'makeOutMessageForward',
        'makeCommand',
        'makeMount',
        'makeMountStream',
        'makeResource',
        'makeComposition',
      ]
        .map(name => "'" + name + "'")
        .join(' | ')
      return (
        text.slice(0, start) +
        'interface FamilyDefinitionFields<' +
        params +
        '> extends Pick<' +
        base +
        ', ' +
        names +
        '> { readonly [FamilyDefinitionTypeId]: ' +
        base +
        "['contract']; readonly makeBlock: MakeFamilyBlock<Id, ModelSchema, MessageSchema, OutMessageSchema, Config>; }\nexport type FamilyDefinition<" +
        params +
        '> = ' +
        fields +
        ' & Pick<' +
        base +
        ', Exclude<keyof ' +
        base +
        ', keyof ' +
        fields +
        " | 'contract' | 'makeBlock'>>;\n" +
        text.slice(end)
      )
    })
  }
  if (name === 'family-definition-owned-by-contract') {
    const familyFile = join(target, 'dist/experimental/contracted/family.d.ts')
    const contractFile = join(
      target,
      'dist/experimental/contracted/contract.d.ts',
    )
    let family = readFileSync(familyFile, 'utf8')
    const start = family.indexOf('export type FamilyDefinition<')
    const end = family.indexOf('/** A family provider', start)
    const definition = family.slice(start, end)
    const signatureStart = family.indexOf(
      'export interface FamilyNamespaceMakeDefinition',
    )
    const signatureEnd = family.indexOf(
      '/** Declares a specialization',
      signatureStart,
    )
    const signature = family
      .slice(signatureStart, signatureEnd)
      .replace("Omit<Declaration, 'key'>", "Omit<FamilyDeclaration, 'key'>")
      .replace('IsUnion<Key>', 'FamilyIsUnion<Key>')
      .replace('MessageFreeValidation<', 'FamilyMessageFreeValidation<')
    family = family.slice(0, signatureStart) + family.slice(signatureEnd)
    family =
      family.slice(0, start) +
      "export type {FamilyDefinition, FamilyNamespaceMakeDefinition} from './contract.js';\nimport type {FamilyDefinition, FamilyDefinitionTypeId} from './contract.js';\n" +
      family.slice(end)
    family = family.replace(
      'declare const FamilyDefinitionTypeId: unique symbol;\n',
      '',
    )
    writeFileSync(familyFile, family)
    writeFileSync(
      contractFile,
      readFileSync(contractFile, 'utf8') +
        "\nexport declare const FamilyDefinitionTypeId: unique symbol;\ntype FamilyDeclaration = ContractConfiguration & Readonly<{Model:AnySchema;Message:AnySchema;OutMessage?:AnySchema;ChildInitContext?:AnySchema}>;\ntype FamilyIsUnion<Value, Whole = Value> = Value extends unknown ? [Whole] extends [Value] ? false : true : never;\ntype FamilyMessageFreeValidation<Config extends FamilyDeclaration> = Config extends Readonly<{isMessageFree:true}> ? [Config['Message']['Type']] extends [never] ? readonly [] : readonly [messageFreeContractRequiresNever:never] : readonly [];\n" +
        definition +
        signature,
    )
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        "from '../experimental/contracted/family.js'",
        "from '../experimental/contracted/contract.js'",
      ),
    )
  }
  if (name === 'namespace-owned-family-signature') {
    const family = readFileSync(
      join(target, 'dist/experimental/contracted/family.d.ts'),
      'utf8',
    )
    const start = family.indexOf(
      'export interface FamilyNamespaceMakeDefinition',
    )
    const end = family.indexOf('/** Declares a specialization', start)
    const signature = family.slice(start, end)
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        "import type { FamilyNamespaceMakeDefinition } from '../experimental/contracted/family.js';",
        "import type { FamilyDefinition } from '../experimental/contracted/family.js';\nimport type {Schema} from 'effect';\nimport type {ContractConfiguration} from '../experimental/contracted/contract.js';\nimport type {MessageFreeValidation} from '../experimental/contracted/runtime.js';\ntype AnySchema = Schema.Codec<any,any,any,any>;\ntype Declaration = ContractConfiguration & Readonly<{Model:AnySchema;Message:AnySchema;OutMessage?:AnySchema;ChildInitContext?:AnySchema}>;\ntype OptionalSchema<Config, Key extends PropertyKey> = Config extends Readonly<Record<Key,infer Value extends AnySchema>> ? Value : undefined;\ntype IsUnion<Value,Whole=Value> = Value extends unknown ? [Whole] extends [Value] ? false : true : never;\n" +
          signature,
      ),
    )
  }
  if (name === 'namespace-direct-family-method') {
    const family = readFileSync(
      join(target, 'dist/experimental/contracted/family.d.ts'),
      'utf8',
    )
    const start = family.indexOf(
      'export interface FamilyNamespaceMakeDefinition',
    )
    const end = family.indexOf('/** Declares a specialization', start)
    let signature = family.slice(start, end)
    signature = signature
      .slice(signature.indexOf('{') + 1, signature.lastIndexOf('}'))
      .trim()
      .replace('<const Key', 'makeFamilyDefinition<const Key')
    edit('block/makeNamespace.d.ts', text =>
      text
        .replace(
          "import type { FamilyNamespaceMakeDefinition } from '../experimental/contracted/family.js';",
          "import type { FamilyDefinition } from '../experimental/contracted/family.js';\nimport type {Schema} from 'effect';\nimport type {ContractConfiguration} from '../experimental/contracted/contract.js';\nimport type {MessageFreeValidation} from '../experimental/contracted/runtime.js';\ntype AnySchema = Schema.Codec<any,any,any,any>;\ntype Declaration = ContractConfiguration & Readonly<{Model:AnySchema;Message:AnySchema;OutMessage?:AnySchema;ChildInitContext?:AnySchema}>;\ntype OptionalSchema<Config, Key extends PropertyKey> = Config extends Readonly<Record<Key,infer Value extends AnySchema>> ? Value : undefined;\ntype IsUnion<Value,Whole=Value> = Value extends unknown ? [Whole] extends [Value] ? false : true : never;\n",
        )
        .replace(
          'makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>;',
          signature,
        ),
    )
  }
  if (name === 'namespace-intersection-extension') {
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        /export type Namespace<Id extends string, Concrete extends boolean = true> = Omit<NativeNamespace<Id, Concrete>, 'makeDefinition'> & Readonly<\{\n    makeDefinition: NamespaceMakeDefinition<Id, Concrete>;\n\}> & Readonly<\{\n    makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>;\n\}>;/,
        'interface NamespaceExtension<Id extends string, Concrete extends boolean> { readonly makeDefinition: ContractNamespaceMakeDefinition<Id>; readonly makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>; }\nexport type Namespace<Id extends string, Concrete extends boolean = true> = NativeNamespace<Id, Concrete> & NamespaceExtension<Id,Concrete>;',
      ),
    )
  }
  if (name === 'namespace-family-unknown') {
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        'makeFamilyDefinition: FamilyNamespaceMakeDefinition<Id>;',
        'makeFamilyDefinition: unknown;',
      ),
    )
  }
  if (name === 'namespace-family-return-unknown') {
    edit('experimental/contracted/family.d.ts', text => {
      const start = text.indexOf(
        'export interface FamilyNamespaceMakeDefinition',
      )
      const end = text.indexOf('/** Declares a specialization', start)
      const signature = text.slice(start, end)
      return (
        text.slice(0, start) +
        signature.replace(
          /: FamilyDefinition<[\s\S]*?Config & Readonly<\{\n        key: Key;\n    \}>>;/,
          ': unknown;',
        ) +
        text.slice(end)
      )
    })
  }
  if (name === 'namespace-family-no-constraints') {
    edit('experimental/contracted/family.d.ts', text => {
      const start = text.indexOf(
        'export interface FamilyNamespaceMakeDefinition',
      )
      const end = text.indexOf('/** Declares a specialization', start)
      return (
        text.slice(0, start) +
        'export interface FamilyNamespaceMakeDefinition<Id extends string> { <Config>(config:Config): unknown; }\n' +
        text.slice(end)
      )
    })
  }
  if (name === 'family-static-boundary') {
    const path = join(target, 'dist/experimental/contracted/family.d.ts')
    const family = readFileSync(path, 'utf8')
    const functionsStart = family.indexOf(
      '/** Declares a specialization without',
    )
    const lifetimeStart = family.indexOf('/** A family provider')
    const lifetimeEnd = family.indexOf('type FamilyAuthoring', lifetimeStart)
    let contracts =
      family.slice(0, lifetimeStart) + family.slice(lifetimeEnd, functionsStart)
    contracts = contracts.replace(/^type /gm, 'export type ')
    writeFileSync(
      join(target, 'dist/experimental/contracted/familyContract.d.ts'),
      contracts,
    )
    const imported = [
      'Declaration',
      'IsUnion',
      'OptionalSchema',
      'FamilyAuthoring',
      'FamilyDefinition',
      'FamilyRecipe',
      'FamilyContract',
      'FamilyContractOf',
      'ValidateMembers',
    ].join(', ')
    const imports = family.slice(0, family.indexOf('type AnySchema'))
    writeFileSync(
      path,
      imports +
        '\nimport type {' +
        imported +
        "} from './familyContract.js';\nexport type {FamilyDefinition,FamilyRecipe,FamilyContract,FamilyContractOf,FamilyNamespaceMakeDefinition} from './familyContract.js';\n" +
        family.slice(lifetimeStart, lifetimeEnd) +
        family.slice(functionsStart),
    )
    edit('block/makeNamespace.d.ts', text =>
      text.replace(
        "from '../experimental/contracted/family.js'",
        "from '../experimental/contracted/familyContract.js'",
      ),
    )
    edit('experimental/contracted/contract.d.ts', text =>
      text.replace("from './family.js'", "from './familyContract.js'"),
    )
  }
  if (name === 'family-lazy-fields') {
    edit('experimental/contracted/family.d.ts', text => {
      const start = text.indexOf('export type FamilyDefinition<')
      const end = text.indexOf('/** A family provider', start)
      const params =
        'Id extends string, ModelSchema extends AnySchema, MessageSchema extends AnySchema, OutMessageSchema extends AnySchema | undefined, ChildInitContextSchema extends AnySchema | undefined, Config extends ContractConfiguration'
      const args =
        'Id,ModelSchema,MessageSchema,OutMessageSchema,ChildInitContextSchema,Config'
      const base = 'Definition<' + args + '>'
      const names = [
        'owner',
        'Model',
        'Message',
        'mounts',
        'bindings',
        'makeStep',
        'makeFieldsStep',
        'makeNoopStep',
        'makeCommandsStep',
        'makeSubscriptions',
        'makeManagedResources',
        'makeBinding',
        'makeMapBinding',
        'makeOutMessageFold',
        'makeOutMessageForward',
        'makeCommand',
        'makeMount',
        'makeMountStream',
        'makeResource',
        'makeComposition',
      ]
      const fields = names
        .map(name => 'readonly ' + name + ':' + base + "['" + name + "'];")
        .join('\n')
      const extra =
        '(ChildInitContextSchema extends AnySchema ? Readonly<{ChildInitContext:ChildInitContextSchema}>:unknown) & (OutMessageSchema extends AnySchema ? Readonly<{OutMessage:OutMessageSchema;makeOutMessageStep:' +
        base +
        "['makeOutMessageStep']}> : Readonly<{OutMessage?:never}>)"
      return (
        text.slice(0, start) +
        'interface FamilyDefinitionFields<' +
        params +
        '> { ' +
        fields +
        'readonly [FamilyDefinitionTypeId]:' +
        base +
        "['contract']; readonly makeBlock:MakeFamilyBlock<Id,ModelSchema,MessageSchema,OutMessageSchema,Config>; }\nexport type FamilyDefinition<" +
        params +
        '> = FamilyDefinitionFields<' +
        args +
        '> & ' +
        extra +
        ';\n' +
        text.slice(end)
      )
    })
  }
  if (name === 'descriptor-html-owner') {
    edit('experimental/constructed/authoring.d.ts', text =>
      text.replace("from '../../html/block.js'", "from '../../html/index.js'"),
    )
  }
  if (name === 'descriptor-without-new-names') {
    edit('block/public.d.ts', text =>
      text.replace(
        /export type \{ DescriptorEmbedView, DescriptorViewExtension, \} from '..\/experimental\/constructed\/authoring.js';\n/,
        '',
      ),
    )
  }
  if (name === 'descriptor-consolidated-names') {
    edit('block/public.d.ts', text =>
      text
        .replace(
          'BindingParent, MakeBinding,',
          'BindingParent, DescriptorEmbedView, DescriptorViewExtension, MakeBinding,',
        )
        .replace(
          /export type \{ DescriptorEmbedView, DescriptorViewExtension, \} from '..\/experimental\/constructed\/authoring.js';\n/,
          '',
        ),
    )
  }
  const measurements = {}
  for (const fixture of process.env.MACHINE_ONLY
    ? ['baseline', 'machine-search']
    : ['baseline', 'machine-search', 'workspace-composition-8']) {
    const config = join(root, fixture + '.json')
    writeFileSync(
      config,
      JSON.stringify({
        extends: join(target, 'type-performance/tsconfig.json'),
        files: [join(target, 'type-performance', fixture + '.ts')],
        include: [],
        compilerOptions: { noEmit: true, incremental: false, composite: false },
      }),
    )
    const result = spawnSync(
      process.execPath,
      [
        join(core, 'node_modules/typescript/bin/tsc'),
        '-p',
        config,
        '--extendedDiagnostics',
        '--pretty',
        'false',
      ],
      { cwd: target, encoding: 'utf8', timeout: 120000 },
    )
    const text = `${result.stdout ?? ''}${result.stderr ?? ''}`
    writeFileSync(join(root, fixture + '.log'), text)
    assert.equal(result.status, 0, `${name}/${fixture}: ${text}`)
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
    workspace:
      measurements['workspace-composition-8'] === undefined
        ? null
        : delta('workspace-composition-8'),
  }
  results.push(summary)
  process.stdout.write(JSON.stringify(summary) + '\n')
}
writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2))
process.stdout.write(`Artifacts: ${output}\n`)
