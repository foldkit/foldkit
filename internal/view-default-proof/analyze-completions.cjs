const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = process.cwd()
const sourceRoots = process.argv
  .slice(2)
  .filter(argument => !argument.startsWith('--'))

const sourceFiles = []
const visitDirectory = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) visitDirectory(absolute)
    else if (/\.[cm]?tsx?$/.test(entry.name)) sourceFiles.push(absolute)
  }
}
for (const sourceRoot of sourceRoots)
  visitDirectory(path.resolve(root, sourceRoot))

const propertyName = property => {
  if (!property.name) return undefined
  if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
    return property.name.text
  }
  return undefined
}

const callName = expression => {
  if (ts.isIdentifier(expression)) return expression.text
  if (!ts.isPropertyAccessExpression(expression)) return undefined
  return expression.name.text
}

const containsProperty = (node, name) => {
  let found = false
  const visit = current => {
    if (
      ts.isObjectLiteralExpression(current) &&
      current.properties.some(property => propertyName(property) === name)
    ) {
      found = true
      return
    }
    ts.forEachChild(current, visit)
  }
  if (node) visit(node)
  return found
}

const rows = []
for (const absolute of sourceFiles) {
  const text = fs.readFileSync(absolute, 'utf8')
  const source = ts.createSourceFile(
    absolute,
    text,
    ts.ScriptTarget.Latest,
    true,
  )
  const omitted = new Map()
  const completions = new Map()

  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      [
        'make',
        'makeDefinition',
        'makeFamilyDeclaration',
        'makeFamilyDefinition',
      ].includes(callName(node.initializer.expression))
    ) {
      const config = node.initializer.arguments.find(
        ts.isObjectLiteralExpression,
      )
      const isContracted =
        config &&
        config.properties.some(property => propertyName(property) === 'key') &&
        config.properties.some(
          property => propertyName(property) === 'InitArgs',
        )
      if (
        isContracted &&
        !config.properties.some(property => propertyName(property) === 'view')
      ) {
        const initArgs = config.properties.find(
          property => propertyName(property) === 'InitArgs',
        )
        const lineEnd = initArgs ? text.indexOf('\n', initArgs.end) : -1
        omitted.set(node.name.text, {
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          insertOffset: lineEnd + 1,
          indent: initArgs
            ? ' '.repeat(
                source.getLineAndCharacterOfPosition(initArgs.getStart())
                  .character,
              )
            : '',
        })
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['makeLayer', 'makeBlock'].includes(node.expression.name.text) &&
      ts.isIdentifier(node.expression.expression)
    ) {
      const config = node.arguments[0]
      const hasView = containsProperty(config, 'view')
      completions.set(node.expression.expression.text, {
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        hasView,
      })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  for (const [name, declaration] of omitted) {
    const completion = completions.get(name)
    if (completion) {
      rows.push({
        file: path.relative(root, absolute),
        name,
        declarationLine: declaration.line,
        completionLine: completion.line,
        completionHasView: completion.hasView,
        insertOffset: declaration.insertOffset,
        indent: declaration.indent,
      })
    }
  }
}

if (process.argv.includes('--write-viewless')) {
  const byFile = new Map()
  for (const row of rows.filter(row => !row.completionHasView)) {
    if (row.insertOffset === 0) {
      throw new Error(
        `No InitArgs line ending found for ${row.file}:${row.declarationLine}`,
      )
    }
    const entries = byFile.get(row.file) ?? []
    entries.push(row)
    byFile.set(row.file, entries)
  }
  for (const [file, entries] of byFile) {
    const absolute = path.resolve(root, file)
    let text = fs.readFileSync(absolute, 'utf8')
    for (const row of entries.sort(
      (left, right) => right.insertOffset - left.insertOffset,
    )) {
      text = `${text.slice(0, row.insertOffset)}${row.indent}view: false,\n${text.slice(row.insertOffset)}`
    }
    fs.writeFileSync(absolute, text)
  }
  process.stdout.write(
    `${JSON.stringify({ files: byFile.size, declarations: rows.filter(row => !row.completionHasView).length })}\n`,
  )
} else {
  process.stdout.write(
    `${JSON.stringify(
      rows.map(
        ({ insertOffset: _insertOffset, indent: _indent, ...row }) => row,
      ),
      null,
      2,
    )}\n`,
  )
}
