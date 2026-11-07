import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

const [
  baselineArgument,
  candidateArgument,
  repositoryArgument = process.cwd(),
] = process.argv.slice(2)
if (baselineArgument === undefined || candidateArgument === undefined) {
  throw new Error(
    'Usage: node audit-direct-attributes.mjs <baseline-repository> <candidate-repository> [source-repository]',
  )
}

const repositoryRoot = resolve(repositoryArgument)
const sourcePath = root =>
  join(resolve(root), 'packages/foldkit/src/html/index.ts')
const directHead = '5034908a43dec249761b851b08b6af0f8b601eee'
const require = createRequire(`${repositoryRoot}/package.json`)
const ts = require('typescript')
const sha = text => createHash('sha256').update(text).digest('hex')
const sourceFile = (name, text) =>
  ts.createSourceFile(
    name,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

const declarations = source => {
  const found = new Map()
  const visit = node => {
    if (
      (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)) &&
      [
        'Attribute',
        'TaggedAttribute',
        'AttributeDefinition',
        'HtmlAttributes',
        'HtmlBuilder',
      ].includes(node.name.text)
    ) {
      found.set(node.name.text, node.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

const htmlAttributeProperties = source => {
  let properties
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 'htmlAttributes'
    ) {
      let initializer = node.initializer.body
      if (ts.isParenthesizedExpression(initializer)) {
        initializer = initializer.expression
      }
      properties = new Map(
        initializer.properties.map(property => [
          property.name.getText(source),
          property,
        ]),
      )
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (properties === undefined) throw new Error('Missing htmlAttributes')
  return properties
}

const taggedEnumNames = source => {
  let names
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.name.elements.some(
        element => element.name.getText(source) === 'Prop',
      ) &&
      node.initializer?.getText(source).startsWith('Data.taggedEnum<')
    ) {
      names = node.name.elements.map(element => element.name.getText(source))
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return names
}

const baselineText = readFileSync(sourcePath(baselineArgument), 'utf8')
const candidateText = readFileSync(sourcePath(candidateArgument), 'utf8')
const directText = execFileSync(
  'git',
  ['show', `${directHead}:packages/foldkit/src/html/index.ts`],
  { cwd: repositoryRoot, encoding: 'utf8' },
)
const baseline = sourceFile('baseline.ts', baselineText)
const candidate = sourceFile('candidate.ts', candidateText)
const direct = sourceFile('direct.ts', directText)
const baselineProperties = htmlAttributeProperties(baseline)
const candidateProperties = htmlAttributeProperties(candidate)
const directProperties = htmlAttributeProperties(direct)

const mismatchedDirectBodies = []
for (const [name, property] of candidateProperties) {
  if (name === 'OnMount') continue
  const directProperty = directProperties.get(name)
  if (
    property.initializer.body.getText(candidate) !==
    directProperty.initializer.body.getText(direct)
  ) {
    mismatchedDirectBodies.push(name)
  }
}

const typeShapeDifferences = []
const baselineDeclarations = declarations(baseline)
const candidateDeclarations = declarations(candidate)
for (const [name, text] of baselineDeclarations) {
  if (candidateDeclarations.get(name) !== text) typeShapeDifferences.push(name)
}

const report = {
  baselineSha256: sha(baselineText),
  candidateSha256: sha(candidateText),
  directPrSourceSha256: sha(directText),
  baselineAttributeCount: baselineProperties.size,
  candidateAttributeCount: candidateProperties.size,
  directBodyMatches:
    candidateProperties.size - 1 - mismatchedDirectBodies.length,
  mismatchedDirectBodies,
  onMountSourceUnchanged:
    baselineProperties.get('OnMount').getText(baseline) ===
    candidateProperties.get('OnMount').getText(candidate),
  retainedEffectConstructors: taggedEnumNames(candidate),
  typeShapeDifferences,
}

if (
  report.baselineAttributeCount !== 313 ||
  report.candidateAttributeCount !== 313 ||
  report.directBodyMatches !== 312 ||
  report.mismatchedDirectBodies.length !== 0 ||
  !report.onMountSourceUnchanged ||
  report.retainedEffectConstructors.join(',') !== 'Prop,OnCustomEvent' ||
  report.typeShapeDifferences.length !== 0
) {
  throw new Error(JSON.stringify(report, null, 2))
}
console.log(JSON.stringify(report, null, 2))
