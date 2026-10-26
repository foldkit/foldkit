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
  isPropertyAccessExpression,
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

const assertProgramDiagnosticOrder = async (): Promise<void> => {
  const api = new API({ cwd: packageRoot })

  try {
    const config = await api.parseConfigFile(join(packageRoot, 'tsconfig.json'))
    const program = await api.createProgram(config.fileNames, {
      ...config.options,
      checkers: 1,
    })
    const diagnostics = await program.getSemanticDiagnostics([
      join(packageRoot, 'src/block/authoring.test.ts'),
      join(packageRoot, 'src/mount/define.test.ts'),
    ])

    if (Array.isArrayNonEmpty(Array.fromIterable(diagnostics))) {
      fail(
        `Checking rejected Program roots before Mount contracts produced semantic diagnostics:\n${JSON.stringify(diagnostics, null, 2)}`,
      )
    }
  } finally {
    await api.close()
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
    const snapshot = await api.createSnapshot({
      openProjects: [acceptedConfig],
      openFiles: [acceptedFixture],
    })
    const project = snapshot.getConfiguredProject(acceptedConfig)

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

    const completion = await project.languageService.getCompletionsAtPosition(
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

const assertUpdateAuthoringDocs = async (): Promise<void> => {
  const fixture = join(fixtureRoot, 'record-update.accepted.ts')
  const config = join(fixtureRoot, 'tsconfig.record-update.json')
  const api = new API({ cwd: packageRoot })

  try {
    const snapshot = await api.createSnapshot({
      openProjects: [config],
      openFiles: [fixture],
    })
    const project = snapshot.getConfiguredProject(config)
    if (project === undefined) {
      return fail(`Could not open the update authoring project ${config}.`)
    }
    const diagnostics = await project.program.getSemanticDiagnostics(fixture)
    if (Array.isArrayNonEmpty(Array.fromIterable(diagnostics))) {
      fail(
        `The update authoring fixture has ${diagnostics.length} semantic diagnostics.`,
      )
    }
    const source = await project.program.getSourceFile(fixture)
    if (source === undefined) {
      return fail(`Could not read the update authoring fixture ${fixture}.`)
    }
    const declarations = Array.flatMap(source.statements, statement =>
      isVariableStatement(statement)
        ? Array.fromIterable(statement.declarationList.declarations)
        : [],
    )
    for (const name of ['update', 'contextualUpdate']) {
      const declaration = Array.findFirst(
        declarations,
        declaration =>
          isIdentifier(declaration.name) && declaration.name.text === name,
      )
      if (
        Option.isNone(declaration) ||
        declaration.value.initializer === undefined ||
        !isCallExpression(declaration.value.initializer) ||
        !isPropertyAccessExpression(declaration.value.initializer.expression)
      ) {
        return fail(`Could not find the ${name} authoring call.`)
      }
      const expression = declaration.value.initializer.expression
      const symbol = await project.checker.getSymbolAtLocation(expression.name)
      if (symbol === undefined) {
        return fail(`Could not find the ${name} authoring method.`)
      }
      const documentation = await symbol.getDocumentationComment(
        project.checker,
      )
      const expected =
        name === 'contextualUpdate'
          ? ['per-dispatch context', 'unevaluated']
          : ['exhaustive handler record', 'exact local Message variant']
      if (!expected.every(fragment => documentation.includes(fragment))) {
        fail(
          `The ${name} authoring documentation is missing ${expected.join(', ')}.`,
        )
      }
      const type = await project.checker.getTypeAtLocation(expression)
      const visibleType = await project.checker.typeToString(type)
      if (/^(any|unknown|never)$/.test(visibleType)) {
        fail(`The ${name} authoring method lost its visible call signature.`)
      }
    }
    const marker = 'CounterComposition.makeUpdate.withContext('
    const input = readFileSync(fixture, 'utf8')
    const position = Option.getOrElse(String.indexOf(marker)(input), () =>
      fail(`Could not find the update authoring completion marker ${marker}.`),
    )
    const completion = await project.languageService.getCompletionsAtPosition(
      fixture,
      position + 'CounterComposition.makeUpdate.'.length,
    )
    if (!completion?.entries.some(entry => entry.name === 'withContext')) {
      fail('The makeUpdate completion list does not include withContext.')
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
    const snapshot = await api.createSnapshot({
      openProjects: [config],
      openFiles: [fixture, initializerFixture],
    })
    const project = snapshot.getConfiguredProject(config)
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
        fields: ['field', 'init'],
        nested: [],
        policyFields: [],
      },
      {
        binding: 'SettingsBinding',
        fields: ['field', 'delivery', 'init'],
        nested: [
          { property: 'delivery', fields: ['toUpdateContext'] },
          { property: 'init', fields: ['contextToArgs'] },
        ],
        policyFields: ['forward'],
      },
      {
        binding: 'ProjectedStatusBinding',
        fields: ['placement', 'read', 'write', 'init'],
        nested: [
          { property: 'init', fields: ['contextToArgs', 'toParentFields'] },
        ],
        policyFields: [],
      },
      {
        binding: 'RoomBinding',
        fields: [
          'placement',
          'readAll',
          'key',
          'keySchema',
          'read',
          'writeAt',
          'delivery',
          'subscriptions',
        ],
        nested: [
          { property: 'delivery', fields: ['when', 'toUpdateContext'] },
          { property: 'subscriptions', fields: ['when'] },
        ],
        policyFields: [],
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
        return fail(`Expected ${check.binding} to call makeBinding.`)
      }

      const bindingCall =
        isPropertyAccessExpression(declaration.initializer.expression) &&
        declaration.initializer.expression.name.text ===
          'withOutMessagePolicy' &&
        isCallExpression(declaration.initializer.expression.expression)
          ? declaration.initializer.expression.expression
          : declaration.initializer
      const configuration = Option.getOrElse(
        Array.get(bindingCall.arguments, 1),
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

      if (Array.isArrayNonEmpty(check.policyFields)) {
        const policy = Option.getOrElse(
          Array.get(declaration.initializer.arguments, 0),
          () => fail(`Missing ${check.binding} OutMessage policy.`),
        )
        if (!isObjectLiteralExpression(policy)) {
          return fail(`Expected an object policy for ${check.binding}.`)
        }
        const policyType = await project.checker.getContextualType(policy)
        for (const field of check.policyFields) {
          const symbol =
            policyType === undefined
              ? undefined
              : await project.checker.getPropertyOfType(policyType, field)
          const documentation =
            symbol === undefined
              ? ''
              : await symbol.getDocumentationComment(project.checker)
          if (String.isEmpty(documentation.trim())) {
            return fail(
              `Missing inferred policy documentation for ${check.binding}.${field}.`,
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
    name: 'mandatory-completion',
    accepted: ['mandatory-completion.accepted.ts'],
    rejected: ['mandatory-completion.rejected.ts'],
    consumers: ['mandatory-completion.consume.ts'],
  },
  {
    name: 'from-assembly',
    accepted: [
      'from-assembly.accepted.ts',
      'from-assembly.generic.ts',
      'from-assembly.barrel.ts',
      'from-assembly.lifecycle.ts',
      'generated-dispatch.accepted.ts',
      'composed-init.accepted.ts',
      'exposed-message.accepted.ts',
    ],
    rejected: [
      'from-assembly.rejected.ts',
      'from-assembly.overloaded-producer.ts',
      'from-assembly.carrier-guards.ts',
    ],
    consumers: [
      'from-assembly.assertions.ts',
      'from-assembly.consume.ts',
      'from-assembly.generic-consume.ts',
      'from-assembly.schema-consume.ts',
      'from-assembly.dispatch-consume.ts',
      'from-assembly.precision-consume.ts',
      'from-assembly.channels-consume.ts',
    ],
  },
  {
    name: 'generic-handler-contracts',
    accepted: ['generic-handler-contracts.accepted.ts'],
    rejected: ['generic-handler-contracts.rejected.ts'],
    consumers: ['generic-handler-contracts.consume.ts'],
  },
  {
    name: 'testing-event-delivery',
    accepted: ['testing-event-delivery.accepted.ts'],
    rejected: ['testing-event-delivery.rejected.ts'],
    consumers: ['testing-event-delivery.consume.ts'],
  },
  {
    name: 'generic-service-factory',
    accepted: ['generic-service-factory.accepted.ts'],
    rejected: ['generic-service-factory.rejected.ts'],
    consumers: ['generic-service-factory.consume.ts'],
  },
  {
    name: 'generic-outmessage-policy',
    accepted: ['generic-outmessage-policy/accepted.ts'],
    rejected: ['generic-outmessage-policy/rejected.ts'],
    consumers: [
      'generic-outmessage-policy/accepted.ts',
      'generic-outmessage-policy/consumer.ts',
      'generic-outmessage-policy/assertions.ts',
    ],
  },
  {
    name: 'named-assembly-header',
    accepted: [
      'named-assembly-header.accepted.ts',
      'named-assembly-header.barrel.ts',
    ],
    rejected: ['named-assembly-header.rejected.ts'],
    consumers: ['named-assembly-header.consume.ts'],
  },
  {
    name: 'combined-outmessage',
    accepted: ['combined-outmessage.accepted.ts'],
    rejected: ['combined-outmessage.rejected.ts'],
    consumers: ['combined-outmessage.consume.ts'],
  },
  {
    name: 'callback-guard',
    accepted: ['callback-guard.accepted.ts', 'focused-step.limitations.ts'],
    rejected: ['callback-guard.rejected.ts'],
    consumers: ['focused-step.limitations.consume.ts'],
  },
  {
    name: 'record-update',
    accepted: ['record-update.accepted.ts'],
    rejected: ['record-update.rejected.ts'],
    consumers: ['record-update.consume.ts'],
  },
  {
    name: 'outmessage-policy-selection',
    accepted: ['outmessage-policy-selection.accepted.ts'],
    rejected: ['outmessage-policy-selection.rejected.ts'],
    consumers: ['outmessage-policy-selection.consume.ts'],
  },
  {
    name: 'outmessage-forward',
    accepted: ['outmessage-forward.accepted.ts'],
    rejected: ['outmessage-forward.rejected.ts'],
    consumers: ['outmessage-forward.consume.ts'],
  },
  {
    name: 'outmessage-fold',
    accepted: ['outmessage-fold.accepted.ts'],
    rejected: ['outmessage-fold.rejected.ts'],
    consumers: ['outmessage-fold.consume.ts'],
  },
  {
    name: 'program-server',
    accepted: ['program-server.accepted.ts'],
    rejected: ['program-server.rejected.ts'],
    consumers: ['program-server.consume.ts'],
  },
  {
    name: 'program',
    accepted: [
      'program.accepted.ts',
      'program-inferred-portability.accepted.ts',
      'program-union-services.accepted.ts',
    ],
    rejected: ['program.rejected.ts', 'program-union-services.rejected.ts'],
    consumers: [
      'program.consume.ts',
      'program-inferred-portability.consume.ts',
      'program-union-services.consume.ts',
    ],
  },
  {
    name: 'optional-wrapped-keyed',
    accepted: ['optional-wrapped-keyed.accepted.ts'],
    rejected: ['optional-wrapped-keyed.rejected.ts'],
    consumers: ['optional-wrapped-keyed.consume.ts'],
  },
  {
    name: 'append-initialization',
    accepted: ['append-initialization.accepted.ts'],
    rejected: ['append-initialization.rejected.ts'],
    consumers: ['append-initialization.consume.ts'],
  },
  {
    name: 'set-initialization',
    accepted: ['set-initialization.accepted.ts'],
    rejected: [
      'set-initialization.rejected.ts',
      'binding-init-unions.rejected.ts',
    ],
    consumers: ['set-initialization.consume.ts'],
  },
  {
    name: 'set-optional-initialization',
    accepted: ['set-optional-initialization.accepted.ts'],
    rejected: ['set-optional-initialization.rejected.ts'],
    consumers: ['set-optional-initialization.consume.ts'],
  },
  {
    name: 'insert-initialization',
    accepted: ['insert-initialization.accepted.ts'],
    rejected: ['insert-initialization.rejected.ts'],
    consumers: ['insert-initialization.consume.ts'],
  },
  {
    name: 'view-inputs',
    accepted: ['view-inputs.accepted.ts'],
    rejected: ['view-inputs.rejected.ts'],
    consumers: ['view-inputs.consume.ts'],
  },
  {
    name: 'assembly-view',
    accepted: ['assembly-view.accepted.ts'],
    rejected: ['assembly-view.rejected.ts'],
    consumers: ['assembly-view.consume.ts'],
  },
  {
    name: 'composed-init',
    accepted: ['composed-init.accepted.ts'],
    rejected: ['composed-init.rejected.ts'],
    consumers: ['composed-init.consume.ts'],
  },
  {
    name: 'field-steps',
    accepted: ['field-steps.accepted.ts'],
    rejected: ['field-steps.rejected.ts'],
    consumers: ['field-steps.consume.ts'],
  },
  {
    name: 'commands-steps',
    accepted: ['commands-steps.accepted.ts'],
    rejected: ['commands-steps.rejected.ts'],
    consumers: ['commands-steps.consume.ts'],
  },
  {
    name: 'managed-resource-registry',
    accepted: ['managed-resource-registry.accepted.ts'],
    rejected: ['managed-resource-registry.rejected.ts'],
    consumers: ['managed-resource-registry.consume.ts'],
  },
  {
    name: 'policy-graph',
    accepted: ['policy-graph.accepted.ts', 'policy-graph.ownership.ts'],
    rejected: ['policy-graph.rejected.ts'],
    consumers: ['policy-graph.consume.ts'],
  },
  {
    name: 'keyed-map-field',
    accepted: ['keyed-map-field.accepted.ts'],
    rejected: ['keyed-map-field.rejected.ts'],
    consumers: ['keyed-map-field.consume.ts'],
  },
  {
    name: 'variant-binding',
    accepted: ['variant-binding.accepted.ts'],
    rejected: ['variant-binding.rejected.ts'],
    consumers: ['variant-binding.consume.ts'],
  },
  {
    name: 'command-args',
    accepted: ['command-args.accepted.ts', 'command-args.helper.ts'],
    rejected: ['command-args.rejected.ts'],
    consumers: ['command-args.consume.ts'],
  },
  {
    name: 'story-concurrency',
    accepted: ['story-concurrency.accepted.ts'],
    rejected: ['story-concurrency.rejected.ts'],
    consumers: ['story-concurrency.consume.ts'],
  },
  {
    name: 'test-parent-message',
    accepted: ['test-parent-message.accepted.ts'],
    rejected: ['test-parent-message.rejected.ts'],
    consumers: ['test-parent-message.consume.ts'],
  },
  {
    name: 'extracted-connected-step',
    accepted: [
      'extracted-connected-step.accepted.ts',
      'extracted-connected-step.helper.ts',
    ],
    rejected: ['extracted-connected-step.rejected.ts'],
    consumers: ['extracted-connected-step.consume.ts'],
  },
  {
    name: 'outmessage-steps',
    accepted: ['outmessage-steps.accepted.ts'],
    rejected: ['outmessage-steps.rejected.ts'],
    consumers: ['outmessage-steps.consume.ts'],
  },
  {
    name: 'generated-dispatch',
    accepted: ['generated-dispatch.accepted.ts'],
    rejected: ['generated-dispatch.rejected.ts'],
    consumers: ['generated-dispatch.consume.ts'],
  },
  {
    name: 'generated-bindings',
    accepted: ['generated-bindings.accepted.ts'],
    rejected: ['generated-bindings.rejected.ts'],
    consumers: ['generated-bindings.consume.ts'],
  },
  {
    name: 'subscription-registry',
    accepted: ['subscription-registry.accepted.ts'],
    rejected: ['subscription-registry.rejected.ts'],
    consumers: ['subscription-registry.consume.ts'],
  },
  {
    name: 'operation-constructor',
    accepted: ['operation-constructor.accepted.ts'],
    rejected: ['operation-constructor.rejected.ts'],
    consumers: ['operation-constructor.consume.ts'],
  },
  {
    name: 'exposed-rest',
    accepted: ['exposed-rest.accepted.ts'],
    rejected: ['exposed-rest.rejected.ts'],
    consumers: ['exposed-rest.consume.ts'],
  },
  {
    name: 'exposed-message',
    accepted: ['exposed-message.accepted.ts'],
    rejected: ['exposed-message.rejected.ts'],
    consumers: ['exposed-message.consume.ts'],
  },
  {
    name: 'binding-message-policy',
    accepted: ['binding-message-policy.accepted.ts'],
    rejected: ['binding-message-policy.rejected.ts'],
    consumers: ['binding-message-policy.consume.ts'],
  },
  {
    name: 'strict-routing',
    accepted: ['strict-routing.accepted.ts'],
    rejected: ['strict-routing.rejected.ts'],
    consumers: ['strict-routing.consume.ts'],
  },
  {
    name: 'route-step-program',
    accepted: ['route-step-program.accepted.ts'],
    rejected: ['route-step-program.rejected.ts'],
    consumers: ['route-step-program.consume.ts'],
  },
  {
    name: 'message-free-keyed',
    accepted: ['message-free-keyed.accepted.ts'],
    rejected: ['message-free-keyed.rejected.ts'],
    consumers: ['message-free-keyed.consume.ts'],
  },
  {
    name: 'dual-update',
    accepted: ['dual-update.accepted.ts'],
    rejected: ['dual-update.rejected.ts'],
    consumers: ['dual-update.consume.ts'],
  },
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
    name: 'schema-boundary',
    accepted: ['schema-boundary.accepted.ts'],
    consumers: ['schema-boundary.consumer.ts'],
    rejected: ['schema-boundary.rejected.ts'],
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

  await assertProgramDiagnosticOrder()

  for (const name of [
    'program',
    'command-args',
    'keyed-map-field',
    'variant-binding',
    'managed-resource-registry',
    'policy-graph',
    'story-concurrency',
    'test-parent-message',
    'extracted-connected-step',
    'append-initialization',
    'set-initialization',
    'set-optional-initialization',
    'insert-initialization',
    'generic-service-factory',
    'testing-event-delivery',
  ]) {
    runCompiler(`Checking direct source ${name} contracts`, [
      '-p',
      join(fixtureRoot, `tsconfig.${name}.source.json`),
    ])
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
      const relocatedFixtures = [...check.consumers, ...check.rejected]
      for (const fixture of relocatedFixtures) {
        copyFileSync(join(fixtureRoot, fixture), join(relocated, fixture))
      }
      const consumerConfig = join(relocated, 'tsconfig.json')
      writeFileSync(
        consumerConfig,
        JSON.stringify({
          compilerOptions: { ...compilerOptions, noEmit: true },
          files: relocatedFixtures,
        }),
      )
      runCompiler(`Consuming relocated ${check.name} declarations`, [
        '-p',
        consumerConfig,
      ])
    }

    runCompiler('Checking conservative operation emission metadata', [
      '-p',
      join(fixtureRoot, 'tsconfig.operation-hint.source.json'),
    ])
    const diagnostics = spawnSync(
      process.execPath,
      [join(packageRoot, 'scripts/check-compiler-diagnostics.ts')],
      { cwd: packageRoot, encoding: 'utf8', env: process.env },
    )
    if (diagnostics.error !== undefined) {
      throw diagnostics.error
    }
    if (diagnostics.status !== 0) {
      fail(
        `Compiler diagnostic checks failed:\n${diagnostics.stdout ?? ''}${diagnostics.stderr ?? ''}`,
      )
    }
    process.stdout.write(diagnostics.stdout)
    await assertUpdateAuthoringDocs()
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
