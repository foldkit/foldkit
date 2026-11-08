const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.resolve(__dirname, '../..')
const ignoredDirectories = new Set([
  '.git',
  'coverage',
  'dist',
  'node_modules',
  'tmp',
])

const sourceFiles = []
const visitDirectory = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        visitDirectory(path.join(directory, entry.name))
      }
    } else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
      sourceFiles.push(path.join(directory, entry.name))
    }
  }
}
visitDirectory(root)

const propertyName = property =>
  property.name && ts.isIdentifier(property.name)
    ? property.name.text
    : property.name && ts.isStringLiteral(property.name)
      ? property.name.text
      : undefined

const rows = []
for (const file of sourceFiles) {
  const relativeFile = path.relative(root, file)
  if (
    relativeFile.startsWith('internal/view-default-proof/') ||
    relativeFile ===
      'packages/foldkit/src/experimental/contracted/viewDefault.test.ts'
  ) {
    continue
  }
  const text = fs.readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const visit = node => {
    if (ts.isCallExpression(node)) {
      const isBlockMake =
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'Block' &&
        node.expression.name.text === 'make'
      const isDefinition =
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'makeDefinition'
      const isFamilyDefinition =
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'makeFamilyDefinition'
      const isFamilyDeclaration =
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'makeFamilyDeclaration') ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === 'makeFamilyDeclaration')
      const config = isBlockMake
        ? node.arguments[1]
        : isDefinition
          ? node.arguments.length === 1
            ? node.arguments[0]
            : node.arguments[1]
          : isFamilyDefinition || isFamilyDeclaration
            ? node.arguments[1]
            : undefined
      if (config && ts.isObjectLiteralExpression(config)) {
        const properties = new Set(config.properties.map(propertyName))
        const family = isBlockMake
          ? 'unified'
          : isFamilyDefinition
            ? 'contracted-family-definition'
            : isFamilyDeclaration
              ? 'contracted-family-declaration'
              : properties.has('key') || properties.has('InitArgs')
                ? 'contracted-definition'
                : 'legacy-definition'
        const view = config.properties.find(
          property => propertyName(property) === 'view',
        )
        let classification = 'omitted'
        let viewText = ''
        if (view && ts.isPropertyAssignment(view)) {
          viewText = view.initializer.getText(source)
          if (view.initializer.kind === ts.SyntaxKind.FalseKeyword) {
            classification = 'false'
          } else if (ts.isObjectLiteralExpression(view.initializer)) {
            const kind = view.initializer.properties.find(
              property => propertyName(property) === 'kind',
            )
            const inputs = view.initializer.properties.some(
              property => propertyName(property) === 'Inputs',
            )
            const mounts = view.initializer.properties.some(
              property => propertyName(property) === 'mounts',
            )
            const kindText =
              kind && ts.isPropertyAssignment(kind)
                ? kind.initializer.getText(source)
                : 'default'
            classification = `object:${kindText}:${inputs ? 'inputs' : 'void'}:${mounts ? 'mounts' : 'no-mounts'}`
          } else {
            classification = 'other'
          }
        } else if (view) {
          classification = 'shorthand-or-spread'
          viewText = view.getText(source)
        }
        const { line, character } = source.getLineAndCharacterOfPosition(
          node.getStart(source),
        )
        rows.push({
          file: relativeFile,
          line: line + 1,
          column: character + 1,
          family,
          classification,
          viewText,
        })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

const classifications = Object.fromEntries(
  [...new Set(rows.map(row => row.classification))]
    .sort()
    .map(classification => [
      classification,
      rows.filter(row => row.classification === classification).length,
    ]),
)

const scopeOf = file => {
  if (file.startsWith('packages/foldkit/declaration-tests/')) {
    return 'declaration-tests'
  }
  if (file.startsWith('packages/foldkit/src/')) {
    return /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
      ? 'core-tests'
      : 'core-source'
  }
  if (file.startsWith('examples/')) {
    return 'examples'
  }
  if (file.startsWith('packages/website/')) {
    return 'website'
  }
  if (file.startsWith('packages/ui/')) {
    return file.includes('/declaration-tests/') ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file)
      ? 'ui-tests'
      : 'ui-source'
  }
  if (file.startsWith('internal/')) {
    return 'internal'
  }
  return 'other'
}

const affectedOmissions = rows.filter(
  row => row.family !== 'legacy-definition' && row.classification === 'omitted',
)
const affectedByScope = Object.fromEntries(
  [...new Set(affectedOmissions.map(row => scopeOf(row.file)))]
    .sort()
    .map(scope => [
      scope,
      affectedOmissions.filter(row => scopeOf(row.file) === scope).length,
    ]),
)
const productionOmissions = affectedOmissions.filter(row =>
  ['core-source', 'examples', 'ui-source', 'website'].includes(
    scopeOf(row.file),
  ),
)
const omissionFamiliesByScope = Object.fromEntries(
  [...new Set(rows.map(row => scopeOf(row.file)))].sort().map(scope => {
    const omissions = rows.filter(
      row => scopeOf(row.file) === scope && row.classification === 'omitted',
    )
    return [
      scope,
      Object.fromEntries(
        [...new Set(omissions.map(row => row.family))]
          .sort()
          .map(family => [
            family,
            omissions.filter(row => row.family === family).length,
          ]),
      ),
    ]
  }),
)
const otherAffectedOmissions = affectedOmissions.filter(
  row => scopeOf(row.file) === 'other',
)
const coreSourceLegacyOmissions = rows.filter(
  row =>
    scopeOf(row.file) === 'core-source' &&
    row.family === 'legacy-definition' &&
    row.classification === 'omitted',
)
const internalAffectedOmissions = affectedOmissions.filter(
  row => scopeOf(row.file) === 'internal',
)

const result = {
  typescriptVersion: ts.version,
  classifications,
  affectedOmissionCount: affectedOmissions.length,
  affectedByScope,
  omissionFamiliesByScope,
  otherAffectedOmissions,
  coreSourceLegacyOmissions,
  internalAffectedOmissions,
  productionOmissions,
  affectedOmissions,
  rows,
}
const output = process.argv.includes('--summary')
  ? {
      typescriptVersion: ts.version,
      classifications,
      affectedOmissionCount: affectedOmissions.length,
      affectedByScope,
      omissionFamiliesByScope,
      otherAffectedOmissions,
      coreSourceLegacyOmissions,
      internalAffectedOmissions,
      productionOmissions,
    }
  : result
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
