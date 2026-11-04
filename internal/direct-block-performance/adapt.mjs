import assert from 'node:assert/strict'
import { readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

const modules = realpathSync(
  new URL('../../packages/foldkit/node_modules', import.meta.url),
)
const require = createRequire(resolve(modules, '../../../package.json'))
const ts = require('typescript')

const printer = ts.createPrinter({ removeComments: true })
const canonical = node =>
  printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile())
const member = (node, name) =>
  ts.isPropertyAccessExpression(node) && node.name.text === name
const property = (object, name) =>
  object.properties.find(entry => entry.name?.getText() === name)
const expression = entry =>
  ts.isShorthandPropertyAssignment(entry) ? entry.name : entry.initializer
const withoutBlock = name => (name.endsWith('Block') ? name.slice(0, -5) : name)
const layerName = name => `${withoutBlock(name)}Layer`

/** Creates a direct-Block copy while preserving every original authored body property. */
export const adapt = (source, file) => {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const declarations = new Map()
  for (const statement of parsed.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        declarations.set(declaration.name.text, { declaration, statement })
      }
    }
  }
  const definitions = new Map()
  const compositions = new Map()
  for (const [name, entry] of declarations) {
    const init = entry.declaration.initializer
    if (!init || !ts.isCallExpression(init)) {
      continue
    }
    if (member(init.expression, 'makeDefinition')) {
      definitions.set(name, { ...entry, call: init })
    }
    if (member(init.expression, 'makeComposition')) {
      const owner = init.expression.expression
      if (ts.isIdentifier(owner)) {
        compositions.set(name, { ...entry, call: init, definition: owner.text })
      } else if (
        ts.isCallExpression(owner) &&
        member(owner.expression, 'makeDefinition')
      ) {
        const definition = name.replace(/Composition$/, 'Definition')
        definitions.set(definition, { ...entry, call: owner, chained: true })
        compositions.set(name, { ...entry, call: init, definition })
      }
    }
  }
  const completions = []
  for (const [name, entry] of declarations) {
    const init = entry.declaration.initializer
    if (
      !init ||
      !ts.isCallExpression(init) ||
      !member(init.expression, 'assemble')
    ) {
      continue
    }
    const [prepareName] = init.arguments
    assert.ok(prepareName && ts.isIdentifier(prepareName))
    const prepare = declarations.get(prepareName.text)
    assert.ok(prepare && ts.isArrowFunction(prepare.declaration.initializer))
    const invocation = prepare.declaration.initializer.body
    assert.ok(
      ts.isCallExpression(invocation) &&
        member(invocation.expression, 'prepareBlock'),
    )
    const compositionName = invocation.expression.expression.getText(parsed)
    const composition = compositions.get(compositionName)
    const definition = definitions.get(composition.definition)
    const [body] = invocation.arguments
    assert.ok(body && ts.isObjectLiteralExpression(body))
    completions.push({
      name,
      ...entry,
      prepare,
      compositionName,
      composition,
      definition,
      body,
    })
  }
  const replacements = []
  const replace = (node, text) =>
    replacements.push({ start: node.getStart(parsed), end: node.end, text })
  const addedContracts = []
  const preservedBodies = []
  const childProviders = new Set()
  const ownedBlocks = new Set(completions.map(entry => entry.name))
  const resolveValue = value =>
    ts.isIdentifier(value) && declarations.has(value.text)
      ? declarations.get(value.text).declaration.initializer
      : value
  const childOfBinding = value => {
    if (
      ts.isCallExpression(value) &&
      member(value.expression, 'withOutMessagePolicy')
    ) {
      return childOfBinding(value.expression.expression)
    }
    if (ts.isIdentifier(value)) {
      return childOfBinding(resolveValue(value))
    }
    assert.ok(
      ts.isCallExpression(value) && member(value.expression, 'makeBinding'),
      value.getText(parsed),
    )
    return value.arguments.at(0).getText(parsed)
  }
  for (const completed of completions) {
    const { name, definition, composition, compositionName, body } = completed
    const [id, config] = definition.call.arguments
    assert.ok(id && config && ts.isObjectLiteralExpression(config))
    const declarationName = composition.definition
    const key = `${declarationName}Key`
    const init = resolveValue(expression(property(body, 'init')))
    assert.ok(ts.isCallExpression(init) && member(init.expression, 'makeInit'))
    const [initializer] = init.arguments
    assert.ok(ts.isArrowFunction(initializer))
    const args = initializer.parameters.map(parameter => {
      assert.equal(parameter.questionToken, undefined)
      assert.equal(parameter.dotDotDotToken, undefined)
      assert.equal(parameter.initializer, undefined)
      assert.equal(parameter.type?.kind, ts.SyntaxKind.StringKeyword)
      return 'Schema.String'
    })
    const message = expression(property(config, 'Message'))
    const messageFree =
      message.getText(parsed) === 'Schema.Never' ||
      resolveValue(message)?.getText(parsed) === 'Schema.Never'
    const inventory = composition.call.arguments.at(0)
    const bindingsProperty =
      inventory && ts.isObjectLiteralExpression(inventory)
        ? property(inventory, 'bindings')
        : undefined
    const bindings = bindingsProperty
      ? expression(bindingsProperty).elements
      : []
    const fullyMessageFree = messageFree && bindings.length === 0
    const isWorkspace = file.startsWith('workspace-')
    const service = isWorkspace
      ? name === 'ControlBlock'
        ? undefined
        : 'WorkspaceStore'
      : 'Clock'
    const operations = property(body, 'operations')
    const operationsText = operations
      ? expression(operations).getText(parsed)
      : undefined
    const declaredOperations =
      name === 'ControlBlock'
        ? '{ selectIssue: { message: ControlMessage.ClickedIssue, outMessage: ControlOutMessage.SelectedIssue }, clearQuery: ControlMessage.RequestedClearQuery }'
        : operationsText
    const additions = [
      `key: ${key}`,
      `Init: Schema.Tuple([${args.join(', ')}])`,
      ...(fullyMessageFree ? ['isMessageFree: true'] : []),
      ...(property(body, 'view') ? ["view: { kind: 'Element' }"] : []),
      ...(service ? [`effects: { services: [${service}] }`] : []),
      ...(declaredOperations ? [`operations: ${declaredOperations}`] : []),
    ]
    const ownConfig = `{ ${additions.join(', ')}, ${config.properties.map(entry => entry.getText(parsed)).join(', ')} }`
    const createBlock = `Block.make(${id.getText(parsed)}, ${ownConfig})`
    if (definition.chained) {
      replace(
        composition.statement,
        `const ${key} = Symbol(${id.getText(parsed)})\nconst ${declarationName} = ${createBlock}\nconst ${compositionName} = ${declarationName}.makeComposition(${composition.call.arguments.map(arg => arg.getText(parsed)).join(', ')})`,
      )
    } else {
      replace(
        definition.statement,
        `const ${key} = Symbol(${id.getText(parsed)})\nconst ${declarationName} = ${createBlock}`,
      )
    }
    const providers = [...new Set(bindings.map(childOfBinding).map(layerName))]
    for (const child of bindings.map(childOfBinding)) {
      if (!ownedBlocks.has(child)) {
        childProviders.add(child)
      }
    }
    const connectionNames = bindings.map(
      (_binding, index) => `child${String(index + 1).padStart(3, '0')}`,
    )
    const bindingNames = connectionNames.map(
      connection => `${connection}Binding`,
    )
    const acquire =
      bindings.length === 0
        ? ''
        : `const [${bindingNames.join(', ')}] = ${compositionName}.bindings\n${connectionNames.map((connection, index) => `const ${connection} = yield* ${bindingNames.at(index)}`).join('\n')}\n\n`
    const implementationProperties = body.properties.filter(
      entry => entry.name?.getText(parsed) !== 'operations',
    )
    const constructedBody = `{ children: [${connectionNames.join(', ')}], ${implementationProperties.map(entry => entry.getText(parsed)).join(', ')} }`
    const construct =
      bindings.length === 0
        ? `Effect.succeed(${constructedBody})`
        : `Effect.gen(function* () {\n${acquire}return ${constructedBody}\n})`
    const ownLayer = `${declarationName}.makeLayer(${construct})`
    const provided =
      providers.length === 0
        ? ownLayer
        : `Layer.provide(${ownLayer}, ${providers.length === 1 ? providers.at(0) : `Layer.mergeAll(${providers.join(', ')})`})`
    const exported = completed.statement.modifiers?.some(
      modifier => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
      ? 'export '
      : ''
    replace(completed.prepare.statement, '')
    replace(
      completed.statement,
      `${exported}const ${layerName(name)} = ${provided}\n${exported}const ${name} = ${declarationName}`,
    )
    for (const statement of parsed.statements) {
      if (
        ts.isInterfaceDeclaration(statement) &&
        statement.name.text === name
      ) {
        replace(statement, '')
      }
    }
    addedContracts.push({
      block: name,
      definition: declarationName,
      id: id.text,
      key,
      init: args,
      messageFree,
      fullyMessageFree,
      view: property(body, 'view') ? 'Element' : undefined,
      services: service ? [service] : [],
      operations: declaredOperations,
      providers,
      yieldedBindings: bindings.length,
    })
    for (const authored of body.properties) {
      preservedBodies.push({
        block: name,
        property: authored.name.getText(parsed),
        canonical: canonical(authored),
        destination:
          authored.name.getText(parsed) === 'operations'
            ? 'declaration'
            : 'implementation',
      })
    }
  }
  for (const statement of parsed.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue
    }
    const imports = statement.importClause.namedBindings.elements
    const needed = imports.flatMap(entry =>
      childProviders.has(entry.name.text) ? [layerName(entry.name.text)] : [],
    )
    if (needed.length > 0) {
      const original = statement.getText(parsed)
      replace(statement, original.replace('{', `{ ${needed.join(', ')}, `))
    }
  }
  const visit = node => {
    if (ts.isCallExpression(node) && member(node.expression, 'makeElement')) {
      const [configuration] = node.arguments
      assert.ok(ts.isObjectLiteralExpression(configuration))
      replace(
        configuration,
        `{ layer: ApplicationLayer, ${configuration.properties.map(entry => entry.getText(parsed)).join(', ')} }`,
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(parsed)
  let output = source
  for (const edit of replacements.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end)
  }
  output = output
    .replace(
      'Update.RequirementsOf<typeof update>',
      "SelectedLayerFacts<typeof ApplicationLayer, typeof ApplicationBlock.owner>['update']['requirements']",
    )
    .replace(
      /Value extends ElementProgram<[\s\S]*?infer _ProvidedServices\s*>\s*\? Requirements\s*:\s*never/,
      "Value extends { readonly '~foldkit/ProgramProvision'?: { readonly Requirements: (requirements: infer Requirements) => unknown } } ? Requirements : never",
    )
    .replace(
      /Layer\.Services<typeof (\w+)\.EffectsLayer>/g,
      (_all, block) =>
        `SelectedLayerFacts<typeof ${layerName(block)}, typeof ${block}.owner>['effectsLayerRequirements']`,
    )
    .replace(
      /Layer\.Error<typeof (\w+)\.EffectsLayer>/g,
      (_all, block) =>
        `SelectedLayerFacts<typeof ${layerName(block)}, typeof ${block}.owner>['effectsLayerError']`,
    )
  if (output.includes('SelectedLayerFacts<')) {
    const imports = ts
      .createSourceFile(file, output, ts.ScriptTarget.Latest, true)
      .statements.filter(ts.isImportDeclaration)
    const offset = imports.at(-1)?.end ?? 0
    output =
      output.slice(0, offset) +
      "\nimport type { SelectedLayerFacts } from '../dist/runtime/rootBlock.js'" +
      output.slice(offset)
  }
  const transformed = ts.createSourceFile(
    file,
    output,
    ts.ScriptTarget.Latest,
    true,
  )
  const updatedBodies = []
  const findBodies = node => {
    if (ts.isCallExpression(node) && member(node.expression, 'makeLayer')) {
      const [constructor] = node.arguments
      const [argument] = constructor.arguments
      const body = member(constructor.expression, 'succeed')
        ? argument
        : argument.body.statements.find(statement =>
            ts.isReturnStatement(statement),
          )?.expression
      assert.ok(body && ts.isObjectLiteralExpression(body))
      updatedBodies.push(
        ...body.properties
          .filter(entry => entry.name?.getText(transformed) !== 'children')
          .map(canonical),
      )
    }
    ts.forEachChild(node, findBodies)
  }
  findBodies(transformed)
  assert.deepEqual(
    updatedBodies,
    preservedBodies
      .filter(entry => entry.destination === 'implementation')
      .map(entry => entry.canonical),
    `${file}: authored body changed`,
  )
  const updatedDeclarations = new Map()
  for (const statement of transformed.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue
    }
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name)) {
        updatedDeclarations.set(declaration.name.text, declaration)
      }
    }
  }
  let movedOperations = 0
  const operationSources = record => {
    assert.ok(ts.isObjectLiteralExpression(record))
    return record.properties.map(entry => {
      const value = expression(entry)
      const source = ts.isObjectLiteralExpression(value)
        ? expression(property(value, 'message'))
        : value
      return [entry.name.getText(), canonical(source)]
    })
  }
  for (const completed of completions) {
    const original = property(completed.body, 'operations')
    if (!original) {
      continue
    }
    const current = updatedDeclarations.get(completed.composition.definition)
    const config = current.initializer.arguments.at(1)
    const operations = property(config, 'operations')
    assert.ok(operations)
    assert.deepEqual(
      operationSources(expression(operations)),
      operationSources(expression(original)),
      `${file}: moved operation sources changed`,
    )
    movedOperations += operationSources(expression(original)).length
  }
  const syntaxBoundaries = new Set(
    completions.flatMap(completed => [
      completed.name,
      completed.prepare.declaration.name.text,
      completed.composition.definition,
      ...(completed.definition.chained ? [completed.compositionName] : []),
    ]),
  )
  let preservedDomainDeclarations = 0
  for (const [name, { declaration }] of declarations) {
    if (
      syntaxBoundaries.has(name) ||
      name === 'program' ||
      declaration.initializer === undefined
    ) {
      continue
    }
    const updated = updatedDeclarations.get(name)
    assert.ok(updated?.initializer, `${file}: lost ${name}`)
    assert.equal(
      canonical(updated.initializer),
      canonical(declaration.initializer),
      `${file}: domain declaration ${name} changed`,
    )
    preservedDomainDeclarations += 1
  }
  const countAssertions = sourceFile => {
    let count = 0
    const visit = node => {
      if (
        ts.isTypeReferenceNode(node) &&
        ts.isIdentifier(node.typeName) &&
        node.typeName.text === 'Expect'
      ) {
        count += 1
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return count
  }
  const beforeAssertions = countAssertions(parsed)
  const afterAssertions = countAssertions(transformed)
  assert.equal(afterAssertions, beforeAssertions)
  return {
    output,
    facts: {
      file,
      blocks: addedContracts,
      preservedAuthoredProperties: preservedBodies.length,
      preservedDomainDeclarations,
      movedOperations,
      retainedAssertions: afterAssertions,
    },
  }
}

if (process.argv.at(1)?.endsWith('/adapt.mjs')) {
  const [input, output] = process.argv.slice(2)
  assert.ok(input && output)
  const transformed = adapt(
    readFileSync(input, 'utf8'),
    input.split('/').at(-1),
  )
  writeFileSync(output, transformed.output)
  writeFileSync(
    `${output}.facts.json`,
    JSON.stringify(transformed.facts, null, 2),
  )
  console.log(join(output))
}
