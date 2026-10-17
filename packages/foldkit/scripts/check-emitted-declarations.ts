import { Array, Option, String } from 'effect'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { API } from '../node_modules/typescript/dist/api/async/api.js'
import {
  isCallExpression,
  isIdentifier,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isVariableStatement,
} from '../node_modules/typescript/dist/ast/index.js'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureRoot = join(packageRoot, 'declaration-tests')
const compiler = join(
  packageRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
)

const fail = (message: string): never => {
  throw new Error(message)
}

const runCompiler = (label: string, args: ReadonlyArray<string>): string => {
  const result = spawnSync(compiler, args, {
    cwd: packageRoot,
    encoding: 'utf8',
    env: process.env,
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

  if (result.status !== 0) {
    return fail(`${label} failed${output === '' ? '' : `:\n${output}`}`)
  }

  return output
}

const assertBuiltEntry = (path: string): void => {
  if (!existsSync(join(packageRoot, path))) {
    fail(
      `Missing ${path}. Build the foldkit package before checking its emitted declarations.`,
    )
  }
}

const assertBindingCompletions = async (): Promise<void> => {
  const acceptedFixture = join(fixtureRoot, 'accepted.ts')
  const acceptedConfig = join(fixtureRoot, 'tsconfig.accepted.json')
  const marker = 'ChildBinding.refresh()(model)'
  const source = readFileSync(acceptedFixture, 'utf8')
  const markerPosition = Option.getOrElse(String.indexOf(marker)(source), () =>
    fail(`Could not find the Binding completion marker ${marker}.`),
  )

  const api = new API({ cwd: packageRoot })

  try {
    const snapshot = await api.updateSnapshot({
      openProjects: [acceptedConfig],
      openFiles: [acceptedFixture],
    })
    const project = snapshot.getProject(acceptedConfig)

    if (project === undefined) {
      return fail(`Could not open the declaration project ${acceptedConfig}.`)
    }

    const diagnostics =
      await project.program.getSemanticDiagnostics(acceptedFixture)

    if (Array.isArrayNonEmpty(Array.fromIterable(diagnostics))) {
      fail(
        `The native completion fixture has ${diagnostics.length} semantic diagnostics.`,
      )
    }

    const completion = await project.checker.getCompletionsAtPosition(
      acceptedFixture,
      markerPosition + 'ChildBinding.'.length,
    )
    const actual = completion?.entries.map(entry => entry.name).sort()
    const expected = ['embedView', 'fold', 'init', 'placement', 'refresh']

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(
        `Expected Binding completions ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
      )
    }
  } finally {
    await api.close()
  }
}

const assertBindingConfigurationDocs = async (): Promise<void> => {
  const fixture = join(fixtureRoot, 'composition-authoring.accepted.ts')
  const initializerFixture = join(fixtureRoot, 'composition-safety.accepted.ts')
  const config = join(fixtureRoot, 'tsconfig.binding-intellisense.json')
  const api = new API({ cwd: packageRoot })

  try {
    const snapshot = await api.updateSnapshot({
      openProjects: [config],
      openFiles: [fixture, initializerFixture],
    })
    const project = snapshot.getProject(config)
    if (project === undefined) {
      return fail(`Could not open the Binding documentation project ${config}.`)
    }

    const source = await project.program.getSourceFile(fixture)
    if (source === undefined) {
      return fail(
        `Could not read the Binding documentation fixture ${fixture}.`,
      )
    }

    const declarations = Array.flatMap(source.statements, statement =>
      isVariableStatement(statement)
        ? Array.fromIterable(statement.declarationList.declarations)
        : [],
    )
    const checks = [
      {
        binding: 'StatusBinding',
        fields: ['field', 'parentMessage', 'init'],
        nested: [],
      },
      {
        binding: 'SettingsBinding',
        fields: ['fromParentMessage'],
        nested: [{ property: 'fromParentMessage', fields: ['args'] }],
      },
      {
        binding: 'ProjectedStatusBinding',
        fields: [
          'placement',
          'read',
          'write',
          'toParentMessage',
          'fromParentMessage',
          'init',
        ],
        nested: [{ property: 'init', fields: ['args', 'model'] }],
      },
      {
        binding: 'RoomBinding',
        fields: [
          'placement',
          'readAll',
          'key',
          'read',
          'writeAt',
          'toParentMessage',
          'fromParentMessage',
          'subscriptions',
        ],
        nested: [{ property: 'subscriptions', fields: ['when'] }],
      },
    ]

    for (const check of checks) {
      const declaration = Option.getOrElse(
        Array.findFirst(
          declarations,
          declaration =>
            isIdentifier(declaration.name) &&
            declaration.name.text === check.binding,
        ),
        () => fail(`Missing Binding documentation fixture ${check.binding}.`),
      )
      if (
        declaration.initializer === undefined ||
        !isCallExpression(declaration.initializer)
      ) {
        return fail(`Expected ${check.binding} to call bindChild.`)
      }

      const configuration = Option.getOrElse(
        Array.get(declaration.initializer.arguments, 1),
        () => fail(`Missing ${check.binding} configuration.`),
      )
      if (!isObjectLiteralExpression(configuration)) {
        return fail(`Expected an object configuration for ${check.binding}.`)
      }
      const contextualType =
        await project.checker.getContextualType(configuration)
      if (contextualType === undefined) {
        return fail(`Missing contextual type for ${check.binding}.`)
      }

      for (const field of check.fields) {
        const symbol = await project.checker.getPropertyOfType(
          contextualType,
          field,
        )
        const documentation =
          symbol === undefined
            ? ''
            : await symbol.getDocumentationComment(project.checker)
        if (String.isEmpty(documentation.trim())) {
          return fail(
            `Missing inferred configuration documentation for ${check.binding}.${field}.`,
          )
        }
      }

      for (const nested of check.nested) {
        const property = Option.getOrElse(
          Array.findFirst(
            configuration.properties,
            property =>
              isPropertyAssignment(property) &&
              isIdentifier(property.name) &&
              property.name.text === nested.property,
          ),
          () => fail(`Missing ${check.binding}.${nested.property} fixture.`),
        )
        if (
          !isPropertyAssignment(property) ||
          !isObjectLiteralExpression(property.initializer)
        ) {
          return fail(
            `Expected ${check.binding}.${nested.property} to be a configuration object.`,
          )
        }
        const nestedType = await project.checker.getContextualType(
          property.initializer,
        )
        for (const field of nested.fields) {
          const symbol =
            nestedType === undefined
              ? undefined
              : await project.checker.getPropertyOfType(nestedType, field)
          const documentation =
            symbol === undefined
              ? ''
              : await symbol.getDocumentationComment(project.checker)
          if (String.isEmpty(documentation.trim())) {
            return fail(
              `Missing inferred configuration documentation for ${check.binding}.${nested.property}.${field}.`,
            )
          }
        }
      }
    }

    const initializerSource =
      await project.program.getSourceFile(initializerFixture)
    if (initializerSource === undefined) {
      return fail(
        `Could not read the Binding initializer documentation fixture ${initializerFixture}.`,
      )
    }
    const initializerDeclarations = Array.flatMap(
      initializerSource.statements,
      statement =>
        isVariableStatement(statement)
          ? Array.fromIterable(statement.declarationList.declarations)
          : [],
    )
    const initializerChecks = [
      {
        name: 'plainInitializerDocumentation',
        fields: ['args', 'toParentModel', 'commands'],
      },
      {
        name: 'keyedInitializerDocumentation',
        fields: ['key', 'args', 'toParentModel', 'commands'],
      },
    ]

    for (const check of initializerChecks) {
      const declaration = Option.getOrElse(
        Array.findFirst(
          initializerDeclarations,
          declaration =>
            isIdentifier(declaration.name) &&
            declaration.name.text === check.name,
        ),
        () => fail(`Missing Binding initializer fixture ${check.name}.`),
      )
      if (
        declaration.initializer === undefined ||
        !isCallExpression(declaration.initializer)
      ) {
        return fail(`Expected ${check.name} to call Binding.init.`)
      }
      const configuration = Option.getOrElse(
        Array.get(declaration.initializer.arguments, 0),
        () => fail(`Missing ${check.name} configuration.`),
      )
      if (!isObjectLiteralExpression(configuration)) {
        return fail(`Expected an object configuration for ${check.name}.`)
      }
      const contextualType =
        await project.checker.getContextualType(configuration)
      if (contextualType === undefined) {
        return fail(`Missing contextual type for ${check.name}.`)
      }

      for (const field of check.fields) {
        const symbol = await project.checker.getPropertyOfType(
          contextualType,
          field,
        )
        const documentation =
          symbol === undefined
            ? ''
            : await symbol.getDocumentationComment(project.checker)
        if (String.isEmpty(documentation.trim())) {
          return fail(
            `Missing inferred initializer documentation for ${check.name}.${field}.`,
          )
        }
      }
    }
  } finally {
    await api.close()
  }
}

const compilerOptions = {
  strict: true,
  skipLibCheck: false,
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  target: 'ES2022',
  lib: ['ESNext', 'DOM'],
  types: [],
  verbatimModuleSyntax: true,
  exactOptionalPropertyTypes: true,
  noUncheckedIndexedAccess: true,
}

const prepareConsumer = (directory: string, name: string): void => {
  mkdirSync(join(directory, 'node_modules'), { recursive: true })
  writeFileSync(
    join(directory, 'package.json'),
    JSON.stringify({ name, type: 'module' }),
  )

  const dependencies = [
    { name: 'foldkit', target: packageRoot },
    { name: 'effect', target: join(packageRoot, 'node_modules', 'effect') },
  ]
  for (const { name, target } of dependencies) {
    symlinkSync(
      target,
      join(directory, 'node_modules', name),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
  }
}

const assertPortableDeclarations = (directory: string): void => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      assertPortableDeclarations(path)
      continue
    }

    if (!entry.name.endsWith('.d.ts')) {
      continue
    }

    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(
      /(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g,
    )) {
      const reference = match.at(1)
      if (
        reference !== undefined &&
        (isAbsolute(reference) || reference.startsWith('../'))
      ) {
        fail(
          `Emitted declaration ${entry.name} escapes the consumer package through ${reference}.`,
        )
      }
    }
  }
}

const checks: ReadonlyArray<
  Readonly<{
    name: string
    accepted: ReadonlyArray<string>
    rejected: ReadonlyArray<string>
    consumers: ReadonlyArray<string>
  }>
> = [
  {
    name: 'base',
    accepted: ['accepted.ts'],
    rejected: ['rejected.ts'],
    consumers: ['consume-emitted.ts'],
  },
  {
    name: 'focused',
    accepted: ['parent-owned-binding.accepted.ts', 'query-block.accepted.ts'],
    rejected: ['parent-owned-binding.rejected.ts', 'query-block.rejected.ts'],
    consumers: ['parent-owned-binding.consume.ts', 'query-block.consume.ts'],
  },
  {
    name: 'view-helper',
    accepted: ['plain-view-helper.accepted.ts'],
    rejected: ['plain-view-helper.rejected.ts'],
    consumers: ['plain-view-helper.consume.ts'],
  },
  {
    name: 'child-placement',
    accepted: ['child-placement.accepted.ts'],
    rejected: ['child-placement.rejected.ts'],
    consumers: ['child-placement.consume.ts'],
  },
  {
    name: 'direct-field',
    accepted: ['direct-field.accepted.ts'],
    rejected: ['direct-field.rejected.ts'],
    consumers: ['direct-field.consume.ts'],
  },
  {
    name: 'keyed-field',
    accepted: ['keyed-field-binding.accepted.ts'],
    rejected: ['keyed-field-binding.rejected.ts'],
    consumers: ['keyed-field-binding.consume.ts'],
  },
  {
    name: 'wrapped-keyed-field',
    accepted: ['wrapped-keyed-field.accepted.ts'],
    rejected: ['wrapped-keyed-field.rejected.ts'],
    consumers: ['wrapped-keyed-field.consume.ts'],
  },
  {
    name: 'canonical-constructor',
    accepted: ['canonical-constructor.accepted.ts'],
    rejected: ['canonical-constructor.rejected.ts'],
    consumers: ['canonical-constructor.consume.ts'],
  },
  {
    name: 'composition-authoring',
    accepted: ['composition-authoring.accepted.ts'],
    rejected: ['composition-authoring.rejected.ts'],
    consumers: ['composition-authoring.consume.ts'],
  },
  {
    name: 'reciprocal-coordination',
    accepted: ['reciprocal-coordination.accepted.ts'],
    rejected: ['reciprocal-coordination.rejected.ts'],
    consumers: ['reciprocal-coordination.consume.ts'],
  },
  {
    name: 'binding-policy',
    accepted: ['binding-policy.accepted.ts'],
    rejected: ['binding-policy.rejected.ts'],
    consumers: ['binding-policy.consume.ts'],
  },
  {
    name: 'composition-safety',
    accepted: ['composition-safety.accepted.ts'],
    rejected: ['composition-safety.rejected.ts'],
    consumers: ['composition-safety.consume.ts'],
  },
  {
    name: 'schema-match',
    accepted: ['schema-match.accepted.ts'],
    rejected: ['schema-match.rejected.ts'],
    consumers: ['schema-match.consume.ts'],
  },
  {
    name: 'startup-defaults',
    accepted: ['startup-defaults.accepted.ts'],
    rejected: ['startup-defaults.rejected.ts'],
    consumers: ['startup-defaults.consume.ts'],
  },
]

const main = async (): Promise<void> => {
  for (const entry of [
    'dist/index.d.ts',
    'dist/block/public.d.ts',
    'dist/command/public.d.ts',
    'dist/update/public.d.ts',
  ]) {
    assertBuiltEntry(entry)
  }

  const version = runCompiler('Reading the package TypeScript version', [
    '--version',
  ])
  if (!/^Version 7\./.test(version)) {
    fail(`Expected the package TypeScript 7 compiler, received ${version}.`)
  }

  const workspace = mkdtempSync(
    join(tmpdir(), 'foldkit-declaration-consumers-'),
  )

  try {
    const emitter = join(workspace, 'emitter')
    const consumer = join(workspace, 'consumer')
    prepareConsumer(emitter, 'foldkit-declaration-emitter')
    prepareConsumer(consumer, 'foldkit-declaration-consumer')
    const sources = join(emitter, 'fixtures')
    cpSync(fixtureRoot, sources, { recursive: true })

    for (const check of checks) {
      const output = join(emitter, 'emitted', check.name)
      const acceptedConfig = join(emitter, `${check.name}.accepted.json`)
      writeFileSync(
        acceptedConfig,
        JSON.stringify({
          compilerOptions: {
            ...compilerOptions,
            declaration: true,
            declarationMap: false,
            emitDeclarationOnly: true,
            noEmitOnError: true,
            rootDir: sources,
            outDir: output,
          },
          files: check.accepted.map(name => join(sources, name)),
        }),
      )
      runCompiler(`Emitting external ${check.name} declarations`, [
        '-p',
        acceptedConfig,
      ])
      assertPortableDeclarations(output)

      const rejectedConfig = join(emitter, `${check.name}.rejected.json`)
      writeFileSync(
        rejectedConfig,
        JSON.stringify({
          compilerOptions: { ...compilerOptions, noEmit: true },
          files: check.rejected.map(name => join(sources, name)),
        }),
      )
      runCompiler(`Rejecting invalid external ${check.name} wiring`, [
        '-p',
        rejectedConfig,
      ])

      const relocated = join(consumer, check.name)
      cpSync(output, relocated, { recursive: true })
      for (const fixture of check.consumers) {
        copyFileSync(join(fixtureRoot, fixture), join(relocated, fixture))
      }
      const consumerConfig = join(relocated, 'tsconfig.json')
      writeFileSync(
        consumerConfig,
        JSON.stringify({
          compilerOptions: { ...compilerOptions, noEmit: true },
          files: check.consumers,
        }),
      )
      runCompiler(`Consuming relocated ${check.name} declarations`, [
        '-p',
        consumerConfig,
      ])
    }

    await assertBindingCompletions()
    await assertBindingConfigurationDocs()
    process.stdout.write(
      `[emitted-declarations] ${version}; external emission, rejected wiring, relocation, native completion and inferred configuration documentation checks passed.\n`,
    )
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
}

try {
  await main()
} catch (error) {
  const message =
    error instanceof Error ? error.message : globalThis.String(error)
  console.error(`[emitted-declarations] ${message}`)
  process.exitCode = 1
}
