import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const workspace = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)
const sourceRoot = path.join(workspace, 'packages/website/src')
const ts = createRequire(
  fs.realpathSync(path.join(workspace, 'node_modules/typescript/package.json')),
)('@typescript/old')
const args = process.argv.slice(2)
const check = args.includes('--check')
const watch = args.includes('--watch')
const selected = args.includes('--ui')
  ? ['page/ui/block.ts']
  : args.includes('--all')
    ? ['block.ts', 'page/ui/block.ts']
    : ['block.ts']
const reportAt = args.indexOf('--report')
const reportPath =
  reportAt < 0 ? undefined : path.resolve(args.at(reportAt + 1))
for (const [index, arg] of args.entries()) {
  if (index === reportAt + 1 && reportAt >= 0) continue
  if (!['--check', '--watch', '--ui', '--all', '--report'].includes(arg))
    throw Error('Unknown option ' + arg)
}
if (reportPath && fs.existsSync(reportPath))
  throw Error('Refuse overwrite ' + reportPath)
const nativeVersion = JSON.parse(
  fs.readFileSync(
    path.join(
      workspace,
      'packages/foldkit/node_modules/typescript/package.json',
    ),
    'utf8',
  ),
).version
const configFile = path.join(workspace, 'packages/website/tsconfig.json')
const parsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(configFile, ts.sys.readFile).config,
  ts.sys,
  path.dirname(configFile),
)
const q = JSON.stringify

function generate() {
  const started = performance.now()
  const program = ts.createProgram(
    parsed.fileNames.filter(file => !file.includes('/scripts/')),
    parsed.options,
  )
  const checker = program.getTypeChecker()
  const publicSymbols = new Map()
  for (const [file, namespace] of [
    ['block/public.d.ts', 'Block'],
    ['update/public.d.ts', 'Update'],
    ['command/public.d.ts', "import('foldkit/command')"],
    ['subscription/public.d.ts', "import('foldkit/subscription')"],
    ['url/public.d.ts', "import('foldkit/url')"],
    ['calendar/public.d.ts', "import('foldkit/calendar')"],
  ]) {
    const module = program.getSourceFile(
      path.join(workspace, 'packages/foldkit/dist', file),
    )
    const symbol = module && checker.getSymbolAtLocation(module)
    if (symbol)
      for (const exported of checker.getExportsOfModule(symbol))
        publicSymbols.set(
          exported.flags & ts.SymbolFlags.Alias
            ? checker.getAliasedSymbol(exported)
            : exported,
          namespace + '.' + exported.name,
        )
  }
  const outputs = new Map()
  const summary = []
  const inputs = new Set()
  function nodeSymbol(node) {
    return ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node)
  }
  function resolvedSymbol(node) {
    const symbol = nodeSymbol(node)
    return symbol?.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol
  }
  function declaration(node) {
    const symbol = resolvedSymbol(node)
    const found = symbol?.valueDeclaration ?? symbol?.declarations?.at(0)
    if (!found) throw Error(`No declaration: ${node.getText()}`)
    inputs.add(found.getSourceFile().fileName)
    return found
  }
  function initializer(node) {
    if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      const d = declaration(node)
      if (d.initializer) return initializer(d.initializer)
    }
    return node
  }
  function property(object, name) {
    if (!ts.isObjectLiteralExpression(object))
      throw Error(
        `Expected object for ${name}: ${object.getText().slice(0, 100)}`,
      )
    const p = object.properties.find(p => p.name?.getText() === name)
    return p && (ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer)
  }
  function argumentsOf(type) {
    return (
      type.aliasTypeArguments ??
      (type.flags & ts.TypeFlags.Object &&
      type.objectFlags & ts.ObjectFlags.Reference
        ? checker.getTypeArguments(type)
        : [])
    )
  }
  function propType(type, name) {
    const p =
      type.getProperty(name) ??
      checker.getPropertiesOfType(type).find(s => s.name === name)
    if (!p) throw Error(`Missing type property ${name}`)
    return checker.getTypeOfSymbolAtLocation(
      p,
      p.valueDeclaration ?? p.declarations?.at(0),
    )
  }
  for (const blockFile of selected) {
    const sf = program.getSourceFile(path.join(sourceRoot, blockFile))
    inputs.add(sf.fileName)
    // assembleBlock({...}) infers the Block; assembleAs<Implementation>()({...}) checks the same implementation object.
    const assemblyOf = call => {
      if (!call || !ts.isCallExpression(call)) return
      if (
        ts.isPropertyAccessExpression(call.expression) &&
        call.expression.name.text === 'assembleBlock'
      )
        return {
          receiver: call.expression.expression,
          implementation: call.arguments.at(0),
        }
      const selector = call.expression
      if (
        ts.isCallExpression(selector) &&
        ts.isPropertyAccessExpression(selector.expression) &&
        selector.expression.name.text === 'assembleAs'
      )
        return {
          receiver: selector.expression.expression,
          implementation: call.arguments.at(0),
        }
    }
    const block = sf.statements
      .flatMap(s =>
        ts.isVariableStatement(s) ? [...s.declarationList.declarations] : [],
      )
      .find(d => assemblyOf(d.initializer))
    if (!block) throw Error(`No assembly in ${blockFile}`)
    const completionExport = sf.statements
      .flatMap(s =>
        ts.isVariableStatement(s) ? [...s.declarationList.declarations] : [],
      )
      .find(
        d =>
          d.initializer &&
          ts.isIdentifier(d.initializer) &&
          d.initializer.text === block.name.text &&
          d.type,
      )
    const owner = (completionExport ?? block).name.text.replace(/Block$/, '')
    const debug = message => {
      if (process.env.CONTRACT_GENERATOR_DEBUG === '1')
        process.stderr.write(owner + ': ' + message + '\n')
    }
    debug('topology')
    const outputDir = path.dirname(sf.fileName)
    const prefix = owner
    const canonical = new Map()
    const structuralAnchors = []
    const localSymbols = new Map()
    const facts = {
      structural: [
        'Definition identity and canonical Schemas',
        'ordered Composition bindings',
        'binding child references and constructor topology',
        'assembly implementation references',
      ],
      checker: [
        'callback arguments/results',
        'init/update Command requirements',
        'policy output and registration requirements',
        'Subscription and Layer channels',
      ],
    }
    function modulePath(filename) {
      const relative = path
        .relative(outputDir, filename)
        .replace(/\\/g, '/')
        .replace(/\.(d\.)?[cm]?tsx?$/, '')
      return relative.startsWith('.') ? relative : './' + relative
    }
    function importFrom(module, fromFile) {
      return module.startsWith('.')
        ? modulePath(path.resolve(path.dirname(fromFile), module))
        : module
    }
    function valueReference(node) {
      if (ts.isPropertyAccessExpression(node))
        return valueReference(node.expression) + '.' + node.name.text
      if (ts.isQualifiedName(node))
        return valueReference(node.left) + '.' + node.right.text
      if (!ts.isIdentifier(node))
        throw Error(`Unsupported value reference ${node.getText()}`)
      const symbol = nodeSymbol(node)
      const d = symbol?.declarations?.at(0)
      if (d && ts.isImportSpecifier(d)) {
        const imp = d.parent.parent.parent
        return `import(${q(importFrom(imp.moduleSpecifier.text, d.getSourceFile().fileName))}).${d.propertyName?.text ?? d.name.text}`
      }
      if (d && ts.isNamespaceImport(d)) {
        return `import(${q(importFrom(d.parent.parent.moduleSpecifier.text, d.getSourceFile().fileName))})`
      }
      const actual = declaration(node)
      const moduleSymbol = checker.getSymbolAtLocation(actual.getSourceFile())
      const exported =
        moduleSymbol &&
        checker
          .getExportsOfModule(moduleSymbol)
          .find(
            s =>
              (s.flags & ts.SymbolFlags.Alias
                ? checker.getAliasedSymbol(s)
                : s) === resolvedSymbol(node),
          )
      if (!exported)
        throw Error(
          `Unexported value reference ${node.getText()} in ${actual.getSourceFile().fileName}`,
        )
      return `import(${q(modulePath(actual.getSourceFile().fileName))}).${exported.name}`
    }
    function addCanonical(type, text) {
      if (!(type.flags & ts.TypeFlags.Never) && !canonical.has(type.id))
        canonical.set(type.id, text)
    }
    function addValue(node, text = `typeof ${valueReference(node)}`) {
      const type = checker.getTypeAtLocation(node)
      addCanonical(type, text)
      for (const key of [
        'Type',
        'Encoded',
        'DecodingServices',
        'EncodingServices',
      ]) {
        if (type.getProperty(key))
          addCanonical(propType(type, key), `${text}.${key}`)
      }
      return text
    }
    const referenceCache = new Map()
    function symbolReference(symbol) {
      if (referenceCache.has(symbol)) return referenceCache.get(symbol)
      const result = lookupSymbolReference(symbol)
      referenceCache.set(symbol, result)
      return result
    }
    function lookupSymbolReference(symbol) {
      if (localSymbols.has(symbol)) return localSymbols.get(symbol)
      if (publicSymbols.has(symbol)) return publicSymbols.get(symbol)
      const d = symbol?.declarations?.at(0)
      if (!d) return undefined
      const filename = d.getSourceFile().fileName
      if (
        /\/lib\.[^/]+\.d\.ts$/.test(filename) &&
        !symbol.name.startsWith('__')
      )
        return `globalThis.${symbol.name}`
      const mod = checker.getSymbolAtLocation(d.getSourceFile())
      if (!mod || !checker.getExportsOfModule(mod).some(s => s === symbol))
        return undefined
      let module
      const effect = filename.match(/\/effect\/dist\/([\w]+)\.d\.ts$/)
      if (effect) module = 'effect/' + effect.at(1)
      else if (filename.includes('/packages/foldkit/dist/'))
        module = modulePath(filename)
      else if (filename.includes('/node_modules/')) return undefined
      else module = modulePath(filename)
      return `import(${q(module)}).${symbol.name}`
    }
    let renderCount = 0
    let stage = owner
    function render(type, depth = 0, ignoreAlias = false) {
      if (++renderCount > 300000 || depth > 65)
        throw Error('Unbounded semantic leaf; add a named exported contract')
      if (canonical.has(type.id)) return canonical.get(type.id)
      if (type.flags & ts.TypeFlags.Object) {
        const keys = checker.getPropertiesOfType(type).map(s => s.name)
        const anchor = structuralAnchors.find(
          a =>
            a.keys.length === keys.length &&
            a.keys.every(k => keys.includes(k)) &&
            checker.isTypeAssignableTo(type, a.type) &&
            checker.isTypeAssignableTo(a.type, type),
        )
        if (anchor) {
          addCanonical(type, anchor.text)
          return anchor.text
        }
        const base = structuralAnchors.find(
          a =>
            a.keys.length === keys.length &&
            a.keys.every(k => keys.includes(k)),
        )
        if (base) {
          const changed = keys.filter(k => {
            const actual = propType(type, k),
              expected = propType(base.type, k)
            return (
              !checker.isTypeAssignableTo(actual, expected) ||
              !checker.isTypeAssignableTo(expected, actual)
            )
          })
          if (changed.length && changed.length < keys.length / 2) {
            const result = `(Omit<${base.text}, ${changed.map(q).join(' | ')}> & { ${changed.map(k => `readonly ${q(k)}: ${render(propType(type, k), depth + 1)};`).join(' ')} })`
            addCanonical(type, result)
            return result
          }
        }
      }
      if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown))
        throw Error(`Refuse broad semantic leaf ${checker.typeToString(type)}`)
      const primitive = [
        [ts.TypeFlags.Never, 'never'],
        [ts.TypeFlags.Undefined, 'undefined'],
        [ts.TypeFlags.Null, 'null'],
        [ts.TypeFlags.Void, 'void'],
        [ts.TypeFlags.String, 'string'],
        [ts.TypeFlags.Number, 'number'],
        [ts.TypeFlags.Boolean, 'boolean'],
        [ts.TypeFlags.ESSymbol, 'symbol'],
        [ts.TypeFlags.BigInt, 'bigint'],
        [ts.TypeFlags.NonPrimitive, 'object'],
      ].find(([flag]) => type.flags & flag)
      if (primitive) return primitive.at(1)
      if (type.isLiteral())
        return typeof type.value === 'string'
          ? q(type.value)
          : String(type.value)
      if (type.flags & ts.TypeFlags.BooleanLiteral) return type.intrinsicName
      const alias = type.aliasSymbol
      const ref = !ignoreAlias && alias && symbolReference(alias)
      if (ref && !['Readonly', 'Partial'].includes(alias.name)) {
        const a = type.aliasTypeArguments ?? []
        return (
          ref +
          (a.length ? `<${a.map(t => render(t, depth + 1)).join(', ')}>` : '')
        )
      }
      if (type.isUnionOrIntersection())
        return (
          '(' +
          type.types
            .map(t => render(t, depth + 1))
            .join(type.isUnion() ? ' | ' : ' & ') +
          ')'
        )
      if (checker.isTupleType(type)) {
        const target = type.target
        return `${target.readonly ? 'readonly ' : ''}[${checker
          .getTypeArguments(type)
          .map(
            (t, i) =>
              `${target.elementFlags.at(i) & (ts.ElementFlags.Rest | ts.ElementFlags.Variadic) ? '...' : ''}${render(t, depth + 1)}${target.elementFlags.at(i) & ts.ElementFlags.Rest ? '[]' : ''}${target.elementFlags.at(i) & ts.ElementFlags.Optional ? '?' : ''}`,
          )
          .join(', ')}]`
      }
      if (checker.isArrayType(type))
        return `${type.target?.symbol?.name === 'ReadonlyArray' ? 'ReadonlyArray' : 'Array'}<${render(checker.getTypeArguments(type).at(0), depth + 1)}>`
      const reference = type.symbol && symbolReference(type.symbol)
      if (reference) {
        const a = argumentsOf(type)
        return (
          reference +
          (a.length ? `<${a.map(t => render(t, depth + 1)).join(', ')}>` : '')
        )
      }
      if (type.symbol?.name === 'ReadonlyArray')
        return `ReadonlyArray<${argumentsOf(type)
          .map(t => render(t, depth + 1))
          .join(', ')}>`
      const signatures = checker.getSignaturesOfType(
        type,
        ts.SignatureKind.Call,
      )
      if (signatures.length) {
        const rendered = signatures.map(sig => {
          if (sig.typeParameters?.length)
            throw Error('Unsupported generic callback leaf')
          const params = sig.parameters
            .map((s, i) => {
              const d = s.valueDeclaration ?? s.declarations?.at(0)
              return `${d?.dotDotDotToken ? '...' : ''}${ts.isIdentifier(d?.name) ? d.name.text : 'arg' + i}${s.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${render(checker.getTypeOfSymbolAtLocation(s, d ?? sf), depth + 1)}`
            })
            .join(', ')
          return `(${params}) => ${render(checker.getReturnTypeOfSignature(sig), depth + 1)}`
        })
        const props = checker
          .getPropertiesOfType(type)
          .filter(s => !s.name.startsWith('__@'))
        if (!props.length) return '(' + rendered.join(') & (') + ')'
      }
      const properties = checker.getPropertiesOfType(type)
      const indices = checker.getIndexInfosOfType(type)
      if (properties.some(s => s.name.startsWith('__@')))
        throw Error(
          `Unnameable branded leaf in ${stage}: ${checker.typeToString(type).slice(0, 180)}`,
        )
      if (
        !properties.length &&
        !indices.length &&
        type.flags & ts.TypeFlags.TypeParameter
      )
        throw Error('Unbound type parameter')
      return (
        '{ ' +
        [
          ...properties.map(
            s =>
              `readonly ${q(s.name)}${s.flags & ts.SymbolFlags.Optional ? '?' : ''}: ${render(checker.getTypeOfSymbolAtLocation(s, s.valueDeclaration ?? s.declarations?.at(0) ?? sf), depth + 1)};`,
          ),
          ...indices.map(
            i =>
              `readonly [key: ${render(i.keyType, depth + 1)}]: ${render(i.type, depth + 1)};`,
          ),
        ].join(' ') +
        ' }'
      )
    }
    const assembly = assemblyOf(block.initializer)
    const compositionDeclaration = declaration(assembly.receiver)
    const composition = initializer(compositionDeclaration.initializer)
    if (
      !ts.isCallExpression(composition) ||
      composition.expression.name?.text !== 'makeComposition'
    )
      throw Error('Expected makeComposition')
    const definitionNode = composition.expression.expression
    const definition = initializer(declaration(definitionNode).initializer)
    if (
      !ts.isCallExpression(definition) ||
      definition.expression.name?.text !== 'makeDefinition'
    )
      throw Error('Expected makeDefinition')
    const definitionConfig = definition.arguments.at(1)
    const modelNode = property(definitionConfig, 'Model')
    const messageNode = property(definitionConfig, 'Message')
    const model = addValue(modelNode, 'typeof Model')
    const modelType = propType(checker.getTypeAtLocation(modelNode), 'Type')
    structuralAnchors.push({
      type: modelType,
      text: 'typeof Model.Type',
      keys: checker.getPropertiesOfType(modelType).map(s => s.name),
    })
    const message = addValue(messageNode, 'typeof Message')
    for (const member of checker.getPropertiesOfType(
      checker.getTypeAtLocation(messageNode),
    )) {
      const t = checker.getTypeOfSymbolAtLocation(member, messageNode)
      if (t.getProperty('Type')) {
        addCanonical(t, `typeof Message.${member.name}`)
        addCanonical(propType(t, 'Type'), `typeof Message.${member.name}.Type`)
      }
    }
    const contextNode = property(definitionConfig, 'ChildInitContext')
    const context = contextNode ? addValue(contextNode) + '.Type' : 'never'
    const outMessage = property(definitionConfig, 'OutMessage')
    if (
      definitionConfig.properties.some(
        p =>
          !['Model', 'Message', 'ChildInitContext', 'OutMessage'].includes(
            p.name?.getText(),
          ),
      )
    )
      throw Error('Unsupported Definition member')
    if (outMessage)
      throw Error('Prototype does not support parent OutMessage yet')
    const definitionRef = valueReference(definitionNode)
    const config = composition.arguments.at(0)
    if (property(config, 'mounts'))
      throw Error('Prototype does not support local Mounts yet')
    const bindingList = property(config, 'bindings')
    if (!ts.isArrayLiteralExpression(bindingList))
      throw Error('Expected literal ordered bindings')
    for (const source of program.getSourceFiles()) {
      if (
        !source.fileName.startsWith(sourceRoot) ||
        source.fileName.includes('.contract.ts')
      )
        continue
      for (const statement of source.statements)
        if (ts.isVariableStatement(statement))
          for (const d of statement.declarationList.declarations) {
            const call = d.initializer
            if (
              !call ||
              !ts.isCallExpression(call) ||
              !ts.isPropertyAccessExpression(call.expression) ||
              call.expression.name.text !== 'makeCommand' ||
              resolvedSymbol(call.expression.expression) !==
                resolvedSymbol(definitionNode)
            )
              continue
            const type = checker.getTypeAtLocation(d)
            const signature = checker.getSignaturesOfType(type, 0).at(0)
            const command =
              signature && checker.getReturnTypeOfSignature(signature)
            if (command?.getProperty('effect')) {
              addCanonical(
                command,
                `ReturnType<typeof ${valueReference(d.name)}>`,
              )
              const requirements = argumentsOf(propType(command, 'effect')).at(
                2,
              )
              const members = requirements?.isUnion()
                ? requirements.types
                : requirements
                  ? [requirements]
                  : []
              for (const member of members)
                if (member.symbol?.name === 'Handler')
                  addCanonical(
                    member,
                    `import('foldkit/command').HandlerOf<typeof ${valueReference(d.name)}>`,
                  )
            }
          }
    }
    const bindingRows = []
    const bindingTypes = []
    const children = []
    function bindingSource(expr) {
      const node = initializer(expr)
      if (
        !ts.isCallExpression(node) ||
        !ts.isPropertyAccessExpression(node.expression)
      )
        throw Error(`Unsupported Binding ${node.getText()}`)
      if (node.expression.name.text === 'withOutMessagePolicy')
        return { ...bindingSource(node.expression.expression), selected: node }
      if (node.expression.name.text !== 'makeBinding')
        throw Error(
          `Unsupported Binding constructor ${node.expression.name.text}`,
        )
      return { call: node }
    }
    for (const [index, expr] of bindingList.elements.entries()) {
      const b = bindingSource(expr)
      const childNode = b.call.arguments.at(0)
      const child = `typeof ${valueReference(childNode)}`
      const childType = checker.getTypeAtLocation(childNode)
      children.push({ child, type: childType })
      addCanonical(childType, child)
      for (const schemaKey of ['Model', 'Message', 'OutMessage']) {
        if (childType.getProperty(schemaKey)) {
          const schemaType = propType(childType, schemaKey)
          addCanonical(schemaType, `${child}.${schemaKey}`)
          for (const channel of [
            'Type',
            'Encoded',
            'DecodingServices',
            'EncodingServices',
          ])
            if (schemaType.getProperty(channel))
              addCanonical(
                propType(schemaType, channel),
                `${child}.${schemaKey}.${channel}`,
              )
        }
      }
      const bConfig = b.call.arguments.at(1)
      const bType = checker.getTypeAtLocation(expr)
      const fieldNode = property(bConfig, 'field')
      const name =
        (ts.isIdentifier(expr) ? expr.text : `Binding${index}`) + 'Contract'
      bindingTypes.push(name)
      stage = owner + '/' + name
      debug(name)
      let text
      if (b.selected) {
        const selectedType = checker.getTypeAtLocation(b.selected)
        if (selectedType.aliasSymbol?.name !== 'SelectedChildBinding')
          throw Error(
            `Unexpected selected carrier ${selectedType.aliasSymbol?.name}`,
          )
        const parameters = selectedType.aliasTypeArguments
        function sourceRecord(source, inferred, allowed) {
          const object = initializer(source)
          if (!ts.isObjectLiteralExpression(object))
            throw Error('Expected a literal Binding configuration or policy')
          return (
            '{ ' +
            object.properties
              .map(p => {
                if (!p.name || !allowed.includes(p.name.getText()))
                  throw Error('Unsupported Binding configuration member')
                const key = p.name.getText()
                const value = ts.isShorthandPropertyAssignment(p)
                  ? p.name
                  : p.initializer
                const type = propType(inferred, key)
                let text
                if (key === 'field') {
                  if (!ts.isStringLiteral(value))
                    throw Error('Expected literal Binding field')
                  text = q(value.text)
                } else if (key === 'init')
                  text = sourceRecord(value, type, [
                    'contextToArgs',
                    'toParentFields',
                  ])
                else text = render(type)
                return `readonly ${q(key)}: ${text};`
              })
              .join(' ') +
            ' }'
          )
        }
        const configText = sourceRecord(bConfig, parameters.at(4), [
          'field',
          'init',
          'read',
          'write',
        ])
        const policyText = sourceRecord(
          b.selected.arguments.at(0),
          parameters.at(6),
          ['fold', 'forward'],
        )
        text = `Block.SelectedChildBinding<${child}, typeof Model, typeof Message, undefined, ${configText}, ${context}, ${policyText}>`
      } else {
        if (!fieldNode || !ts.isStringLiteral(fieldNode))
          throw Error('Unselected Binding requires a literal field')
        const initialized = propType(childType, 'init')
        text = `InitializedDirectBinding<${child}, ${q(fieldNode.text)}, ${property(bConfig, 'init') ? context : 'never'}>`
        void initialized
      }
      bindingRows.push(`export type ${name} = ${text}`)
      facts.structural.push(
        `${name}: ${fieldNode?.getText() ?? 'accessor'} -> ${valueReference(childNode)}`,
      )
    }
    const implementation = assembly.implementation
    const impl = Object.fromEntries(
      implementation.properties.map(p => [
        p.name.getText(),
        ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer,
      ]),
    )
    if (
      Object.keys(impl).some(
        key =>
          !['init', 'update', 'view', 'subscriptions', 'EffectsLayer'].includes(
            key,
          ),
      )
    )
      throw Error('Unsupported assembly field')
    function requirements(node) {
      const type = checker.getTypeAtLocation(node)
      const sig = checker.getSignaturesOfType(type, 0).at(-1)
      const result = checker.getReturnTypeOfSignature(sig)
      const commands = result.getProperty('commands')
      if (!commands) return checker.getNeverType()
      const commandArray = checker.getNonNullableType(
        propType(result, 'commands'),
      )
      const item = checker.getIndexTypeOfType(commandArray, ts.IndexKind.Number)
      const members = item.isUnion() ? item.types : [item]
      const requirements = members
        .flatMap(t => {
          const requirement = argumentsOf(propType(t, 'effect')).at(2)
          if (!requirement)
            throw Error(
              `No Command requirement ${checker.typeToString(t).slice(0, 150)}`,
            )
          return requirement.isUnion() ? requirement.types : [requirement]
        })
        .filter(t => !(t.flags & ts.TypeFlags.Never))
      return requirements
    }
    function requirementText(node) {
      const req = requirements(node)
      if (!Array.isArray(req)) return 'never'
      const seen = new Set()
      return (
        req
          .filter(
            t =>
              t.symbol?.name !== 'Scoped' && t.aliasSymbol?.name !== 'Scoped',
          )
          .map(t => render(t))
          .filter(t => !seen.has(t) && seen.add(t))
          .join(' | ') || 'never'
      )
    }
    stage = owner + '/implementation'
    debug('implementation')
    const annotatedDeclarations = new Set()
    function registerAnnotations(node) {
      if (ts.isTypeQueryNode(node)) {
        try {
          addCanonical(
            checker.getTypeAtLocation(node),
            `typeof ${valueReference(node.exprName)}`,
          )
        } catch {}
      }
      if (ts.isTypeReferenceNode(node)) {
        const type = checker.getTypeAtLocation(node)
        const symbol = resolvedSymbol(node.typeName)
        const reference = symbol && symbolReference(symbol)
        if (reference && !node.typeArguments?.length)
          addCanonical(type, reference)
        const d = symbol?.declarations?.at(0)
        if (
          !reference &&
          d &&
          ts.isTypeAliasDeclaration(d) &&
          !annotatedDeclarations.has(d)
        ) {
          annotatedDeclarations.add(d)
          registerAnnotations(d.type)
        }
      }
      ts.forEachChild(node, registerAnnotations)
    }
    for (const node of Object.values(impl))
      registerAnnotations(declaration(node))
    const initType = checker.getTypeAtLocation(impl.init)
    const initSignature = checker.getSignaturesOfType(initType, 0).at(0)
    const initParameters = initSignature.parameters
      .map(s => {
        const d = s.valueDeclaration ?? s.declarations?.at(0)
        return `${d?.dotDotDotToken ? '...' : ''}${s.name}: ${render(checker.getTypeOfSymbolAtLocation(s, d ?? sf))}`
      })
      .join(', ')
    const initRequirements = `ChildInitRequirements<${prefix}Bindings[number]> | ${requirementText(impl.init)}`
    const updateRequirements = `ChildUpdateRequirements<${prefix}Bindings[number]> | ${requirementText(impl.update)}`
    debug('lifecycle')
    function subscriptionEntries(node) {
      const call = initializer(node)
      if (
        !ts.isCallExpression(call) ||
        !ts.isPropertyAccessExpression(call.expression)
      )
        throw Error('Unsupported Subscription registry')
      if (call.expression.name.text === 'aggregate')
        return call.arguments.flatMap(subscriptionEntries)
      if (call.expression.name.text !== 'makeSubscriptions')
        throw Error('Expected owned makeSubscriptions')
      const callback = call.arguments.at(0)
      if (!ts.isArrowFunction(callback))
        throw Error('Expected Subscription factory callback')
      let body = callback.body
      while (ts.isParenthesizedExpression(body)) body = body.expression
      if (!ts.isObjectLiteralExpression(body))
        throw Error('Expected literal Subscription entry record')
      return body.properties.map(p => {
        const entry = p.initializer
        if (
          !ts.isPropertyAssignment(p) ||
          !ts.isCallExpression(entry) ||
          !ts.isStringLiteral(entry.arguments.at(0))
        )
          throw Error('Expected declared Subscription entry')
        const config = entry.arguments.at(-1)
        if (!property(config, 'handler') || property(config, 'keepAlive'))
          throw Error(
            'Prototype requires attached Subscription handlers without keepAlive',
          )
        const messages = property(config, 'messages')
        if (!ts.isArrayLiteralExpression(messages))
          throw Error('Expected literal Subscription Message schemas')
        const dependencies =
          entry.arguments.length === 2
            ? 'Record<string, never>'
            : 'Readonly<{ ' +
              entry.arguments
                .at(1)
                .properties.map(field => {
                  if (!ts.isPropertyAssignment(field))
                    throw Error('Expected declared dependency Schema')
                  const schema = checker.getTypeAtLocation(field.initializer)
                  return `${field.name.getText()}: ${render(propType(schema, 'Type'))};`
                })
                .join(' ') +
              ' }>'
        const schemas = `(typeof ${valueReference(impl.subscriptions)})[${q(p.name.getText())}]['messages']`
        const name = `${definition.arguments.at(0).text}/${entry.arguments.at(0).text}`
        const layer = argumentsOf(
          propType(checker.getTypeAtLocation(entry), 'layer'),
        )
        if (layer.length !== 3)
          throw Error('Expected explicit Subscription Layer channels')
        return `readonly ${p.name.getText()}: Entry<${q(name)}, ${dependencies}, ${schemas}, ${render(layer.at(1))}, ${render(layer.at(2))}>`
      })
    }
    const subscriptionHelper = impl.subscriptions
      ? `import type { Layer } from 'effect'\nimport type * as Subscription from 'foldkit/subscription'\ntype Entry<Name extends string, Dependencies, Messages extends ReadonlyArray<Schema.Top>, Errors, Services> = Subscription.LayeredEntryWithoutKeepAlive<Name, typeof Model.Type, Messages[number]['Type'], Dependencies, Messages> & Readonly<{layer: Layer.Layer<Subscription.Handler<Name, Dependencies, Messages[number]['Type']>, Errors, Services>}> & Subscription.Subscription<typeof Model.Type, typeof Message.Type, Dependencies, Subscription.Handler<Name, Dependencies, Messages[number]['Type']>>\n`
      : ''
    const subscriptions = impl.subscriptions
      ? '{ ' + subscriptionEntries(impl.subscriptions).join('; ') + ' }'
      : 'Readonly<Record<never, never>>'
    const localLayer = impl.EffectsLayer
      ? render(checker.getTypeAtLocation(impl.EffectsLayer))
      : `import('effect/Layer').Layer<never, never, never>`
    debug('view')
    const viewType = checker.getTypeAtLocation(impl.view)
    if (viewType.aliasSymbol?.name !== 'OwnedAuthoredView')
      throw Error(`Unsupported authored view ${viewType.aliasSymbol?.name}`)
    const viewArgs = viewType.aliasTypeArguments
    addCanonical(viewArgs.at(3), `${prefix}Dispatch['Type']`)
    addCanonical(viewArgs.at(4), `${prefix}ViewRequirements`)
    const viewFn = viewArgs.at(0)
    const viewResult = checker.getReturnTypeOfSignature(
      checker.getSignaturesOfType(viewFn, 0).at(0),
    )
    const isDocument = Boolean(viewResult.getProperty('title'))
    const viewFunctionText = render(viewFn)
    const preamble = `// Generated by scripts/generate-block-contracts.mjs. Run --check in CI.\nimport type { ContractGenerationStatus } from ${q(modulePath(path.join(sourceRoot, 'block.generation-status.ts')))}\ntype RequireFresh<T extends true> = T\nexport type ContractFreshness = RequireFresh<ContractGenerationStatus>\nimport type { Schema } from 'effect'\nimport type { Block, Update } from 'foldkit'\nimport type { Model } from ${q(modulePath(declaration(modelNode).getSourceFile().fileName))}\nimport type { Message } from ${q(modulePath(declaration(messageNode).getSourceFile().fileName))}\n`
    const internal = name =>
      modulePath(path.join(workspace, 'packages/foldkit/dist/block', name))
    outputs.set(
      path.join(outputDir, 'block.bindings.contract.ts'),
      preamble +
        `import type { ChildEnvelope } from ${q(internal('childEnvelope'))}\n\n` +
        `export type DirectBinding<Child extends Block.AnyBlock, Field extends keyof typeof Model.Type & string> = Block.Binding<Child, typeof Model.Type, ChildEnvelope<Field, Child['Message']['Type']>, Field, never, typeof Model.Type, typeof Message.Type, never, ChildEnvelope<Field, Child['Message']['Type']>, ChildEnvelope<Field, Child['Message']['Type']>, typeof Message, Schema.Codec<ChildEnvelope<Field, Child['Message']['Type']>, ChildEnvelope<Field, Child['Message']['Encoded']>, Child['Message']['DecodingServices'], Child['Message']['EncodingServices']>>\nexport type InitializedDirectBinding<Child extends Block.AnyBlock, Field extends keyof typeof Model.Type & string, Context = never> = DirectBinding<Child, Field> & Block.InitialBindingEvidence<Field, (typeof Model.Type)[Field], Context, Block.Qualify<Field, Update.RequirementsOf<Child['init']>>, Block.RequirementOfBinding<DirectBinding<Child, Field>>>\n\n` +
        bindingRows.join('\n\n') +
        '\n',
    )
    outputs.set(
      path.join(outputDir, 'block.lifecycle.contract.ts'),
      preamble +
        subscriptionHelper +
        `\nexport type ${prefix}Subscriptions = ${subscriptions}\n` +
        (localLayer
          ? `\nexport type ${prefix}LocalLayer = ${localLayer}\n`
          : ''),
    )
    const layerEvidence = localLayer
      ? `type LocalLayerEvidence = Pick<Block.CompletedBlockWithoutViewOrOutMessage<Block.Owner<'DeclaredLayerEvidence', true>, typeof Schema.Never, typeof Schema.Never, readonly [], readonly [], Readonly<{ init: () => never; update: () => never; EffectsLayer: ${prefix}LocalLayer }>>, typeof LocalEffectsLayerTypeId>\n`
      : 'type LocalLayerEvidence = {}\n'
    outputs.set(
      path.join(outputDir, 'block.contract.ts'),
      preamble +
        `import type { AggregatedChildren } from ${q(internal('binding'))}\nimport type { DispatchSchemaFor } from ${q(internal('childEnvelope'))}\nimport type { DefaultViewTypeId } from ${q(internal('defaultView'))}\nimport type { LocalEffectsLayerTypeId } from ${q(internal('definition'))}\nimport type { ${bindingTypes.join(', ')} } from './block.bindings.contract'\nimport type { ${impl.subscriptions ? prefix + 'Subscriptions, ' : ''}${prefix}LocalLayer } from './block.lifecycle.contract'\n\nexport type ${prefix}Bindings = readonly [${bindingTypes.join(', ')}]\nexport type ${prefix}Dispatch = DispatchSchemaFor<typeof Message, ${prefix}Bindings>\ntype ChildInitRequirements<B extends Block.AnyBinding> = B extends unknown ? Block.Qualify<B['placement'], Update.RequirementsOf<Block.BlockOfBinding<B>['init']>> : never\ntype ChildUpdateRequirements<B extends Block.AnyBinding> = B extends unknown ? Block.Qualify<B['placement'], Update.RequirementsOf<Block.BlockOfBinding<B>['update']>> : never\nexport type ${prefix}InitRequirements = ${initRequirements}\nexport type ${prefix}UpdateRequirements = ${updateRequirements}\nexport type ${prefix}Init = (${initParameters}) => Update.Return<typeof Model.Type, ${prefix}Dispatch['Type'], ${prefix}InitRequirements>\nexport interface ${prefix}Update {\n(message: ${prefix}Dispatch['Type']): (model: typeof Model.Type) => Update.Return<typeof Model.Type, ${prefix}Dispatch['Type'], ${prefix}UpdateRequirements>\n(model: typeof Model.Type, message: ${prefix}Dispatch['Type']): Update.Return<typeof Model.Type, ${prefix}Dispatch['Type'], ${prefix}UpdateRequirements>\n}\nexport type ${prefix}ViewRequirements = Block.RequirementsOfBindings<${prefix}Bindings>\nexport type ${prefix}View = Block.OwnedAuthoredView<${viewFunctionText}, typeof ${definitionRef}.owner, typeof Model.Type, ${prefix}Dispatch['Type'], ${prefix}ViewRequirements>\nexport interface ${prefix}Implementation {\nreadonly init: ${prefix}Init\nreadonly update: ${prefix}Update\nreadonly view: ${prefix}View\n${impl.subscriptions ? `readonly subscriptions: ${prefix}Subscriptions\n` : ''}${localLayer ? `readonly EffectsLayer: ${prefix}LocalLayer\n` : ''}}\ntype Shape = Block.CompletedBlockWithView<typeof ${definitionRef}.owner, typeof Model, ${prefix}Dispatch, readonly [], ${prefix}Bindings, ${prefix}Implementation>\n${layerEvidence}\nexport interface ${prefix}Contract extends LocalLayerEvidence {\nreadonly owner: typeof ${definitionRef}.owner\nreadonly Model: typeof Model\nreadonly Message: ${prefix}Dispatch\nreadonly OutMessage?: never\nreadonly mounts: AggregatedChildren<${prefix}Bindings>['mounts']\nreadonly [Block.LocalMountsTypeId]: readonly []\nreadonly bindings: ${prefix}Bindings\nreadonly init: ${prefix}Init\nreadonly update: ${prefix}Update\nreadonly operations: Readonly<Record<never, never>>\nreadonly subscriptions: Shape['subscriptions']\nreadonly managedResources: Shape['managedResources']\nreadonly EffectsLayer: Shape['EffectsLayer']\nreadonly __blockHandlerRequirements: never\nreadonly hostHandlers: readonly []\nreadonly makeView: Block.DefineView<typeof ${definitionRef}.owner, typeof Model.Type, ${prefix}Dispatch['Type'], ${prefix}ViewRequirements>\nreadonly replaceEffectsLayer: Shape['replaceEffectsLayer']\nreadonly provideHandlers: never\nreadonly [DefaultViewTypeId]: ${prefix}View\n}\n`,
    )
    const witnessDir = path.join(
      workspace,
      'packages/website/contract-witnesses',
    )
    const rel = p => {
      const r = path
        .relative(witnessDir, p)
        .replace(/\\/g, '/')
        .replace(/\.ts$/, '')
      return r.startsWith('.') ? r : './' + r
    }
    const implImports = Object.entries(impl)
      .map(
        ([key, node]) =>
          `import { ${declaration(node).name.text} as ${key} } from ${q(rel(declaration(node).getSourceFile().fileName))}`,
      )
      .join('\n')
    outputs.set(
      path.join(witnessDir, `${owner.toLowerCase()}.witness.ts`),
      `import type { ${prefix}Contract as Contract } from ${q(rel(path.join(outputDir, 'block.contract.ts')))}\nimport type { Assembled${prefix} } from ${q(rel(sf.fileName))}\nexport declare const Actual: Assembled${prefix}\ntype Assert<T extends true> = T\ntype IsNever<T> = [T] extends [never] ? true : false\ntype Same<A,B> = [A,B] extends [B,A] ? true : false\ntype IsAny<T> = 0 extends 1 & T ? true : false\nexport type NotAny = Assert<Same<IsAny<typeof Actual>,false>>\nexport type ContractNotAny = Assert<Same<IsAny<Contract>,false>>\nexport type ContractNotNever = Assert<Same<IsNever<Contract>,false>>\nexport type NotNever = Assert<Same<IsNever<typeof Actual>,false>>\nexport type ToContract = Assert<typeof Actual extends Contract ? true : false>\nexport type FromContract = Assert<Contract extends typeof Actual ? true : false>\nexport type Keys = Assert<Same<keyof typeof Actual,keyof Contract>>\nexport type Members = Assert<Same<{ [K in keyof typeof Actual]-?: Same<(typeof Actual)[K], Contract[K & keyof Contract]> }[keyof typeof Actual],true>>\n`,
    )
    const channels = fs
      .readFileSync(
        path.join(
          workspace,
          'packages/website/scripts/block-contract-channels.template',
        ),
        'utf8',
      )
      .replace(
        '../src/block.contract',
        rel(path.join(outputDir, 'block.contract.ts')),
      )
      .replaceAll('ApplicationContract', prefix + 'Contract')
      .replace(
        "import type { Original } from './witness'",
        `import type { Actual as Original } from './${owner.toLowerCase()}.witness'`,
      )
    outputs.set(
      path.join(witnessDir, `${owner.toLowerCase()}.channels.ts`),
      channels,
    )
    debug('done')
    summary.push({
      block: blockFile,
      owner,
      bindings: bindingTypes.length,
      facts,
      requirements: Object.fromEntries(
        ['init', 'update'].map(key => {
          const r = requirements(impl[key])
          return [
            key,
            Array.isArray(r)
              ? {
                  total: r.length,
                  local: r.filter(
                    t =>
                      t.symbol?.name !== 'Scoped' &&
                      t.aliasSymbol?.name !== 'Scoped',
                  ).length,
                }
              : { total: 0, local: 0 },
          ]
        }),
      ),
      renderNodes: renderCount,
    })
  }
  for (const [file, text] of outputs) {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    const used = new Set()
    function visit(node) {
      if (ts.isImportDeclaration(node)) return
      if (
        ts.isIdentifier(node) &&
        !(
          ts.isPropertyAccessExpression(node.parent) &&
          node.parent.name === node
        ) &&
        !(ts.isQualifiedName(node.parent) && node.parent.right === node)
      )
        used.add(node.text)
      ts.forEachChild(node, visit)
    }
    visit(sf)
    let pruned = text
    for (const statement of sf.statements)
      if (
        ts.isImportDeclaration(statement) &&
        ts.isNamedImports(statement.importClause?.namedBindings)
      ) {
        const keep = statement.importClause.namedBindings.elements.filter(e =>
          used.has(e.name.text),
        )
        pruned = pruned.replace(
          statement.getText(sf),
          keep.length
            ? `import ${statement.importClause.isTypeOnly ? 'type ' : ''}{ ${keep.map(e => e.getText(sf)).join(', ')} } from ${statement.moduleSpecifier.getText(sf)}`
            : '',
        )
      }
    outputs.set(file, pruned)
  }
  outputs.set(
    path.join(sourceRoot, 'block.generation-status.ts'),
    'export type ContractGenerationStatus = true\n',
  )
  const stale = []
  for (const [file, text] of outputs) {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) continue
    stale.push(path.relative(workspace, file))
    if (!check) {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file + '.tmp', text)
      fs.renameSync(file + '.tmp', file)
    }
  }
  const report = {
    typescript: ts.version,
    elapsedMs: performance.now() - started,
    blocks: summary,
    files: [...outputs].map(([file, text]) => ({
      file: path.relative(workspace, file),
      bytes: Buffer.byteLength(text),
      lines: text.split('\n').length - 1,
    })),
    stale,
    check,
    inputs: [...inputs].map(p => path.relative(workspace, p)),
  }
  if (reportPath)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', {
      flag: 'wx',
    })
  console.log(
    JSON.stringify(
      {
        ...report,
        blocks: summary.map(({ facts, ...s }) => s),
        inputs: undefined,
        elapsedMs:
          process.env.CONTRACT_GENERATOR_TIMING === '1'
            ? report.elapsedMs
            : undefined,
      },
      null,
      2,
    ),
  )
  if (check && stale.length)
    throw Error(`Stale generated contracts: ${stale.join(', ')}`)
}

if (watch && check) throw Error('Choose --watch or --check')
if (watch && reportPath) throw Error('--report is one-shot only')
function run() {
  if (!check)
    fs.writeFileSync(
      path.join(sourceRoot, 'block.generation-status.ts'),
      'export type ContractGenerationStatus = false\n',
    )
  try {
    generate()
    process.exitCode = 0
  } catch (error) {
    if (!check)
      fs.writeFileSync(
        path.join(sourceRoot, 'block.generation-status.ts'),
        'export type ContractGenerationStatus = false\n',
      )
    throw error
  }
}
if (!watch) run()
else {
  let timer
  let running = false
  function rebuild() {
    if (running) return
    running = true
    try {
      run()
    } catch (error) {
      console.error(error)
      process.exitCode = 1
    } finally {
      running = false
    }
  }
  rebuild()
  const watcher = fs.watch(
    sourceRoot,
    { recursive: true },
    (_event, filename) => {
      if (
        !filename ||
        filename.includes('.contract.ts') ||
        filename.endsWith('block.generation-status.ts') ||
        !filename.endsWith('.ts')
      )
        return
      clearTimeout(timer)
      timer = setTimeout(rebuild, 250)
    },
  )
  process.on('SIGINT', () => {
    watcher.close()
    clearTimeout(timer)
    process.exit()
  })
  process.on('SIGTERM', () => {
    watcher.close()
    clearTimeout(timer)
    process.exit()
  })
}
