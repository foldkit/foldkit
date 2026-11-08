import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

const [candidateArgument, repositoryArgument = process.cwd()] =
  process.argv.slice(2)
if (candidateArgument === undefined) {
  throw new Error(
    'Usage: node adapt-direct-attributes.mjs <candidate-repository> [source-repository]',
  )
}

const candidateRoot = resolve(candidateArgument)
const repositoryRoot = resolve(repositoryArgument)
const candidatePath = join(candidateRoot, 'packages/foldkit/src/html/index.ts')
const directHead = '5034908a43dec249761b851b08b6af0f8b601eee'
const expectedBaselineSha256 =
  '3b2464b443db3614e03dda8e9285fbada713788d906c8c198ab23e7469eb06ac'
const expectedDirectSha256 =
  'f6fdc377e12c31144089ec7945ae3372ce03e0d08ed158bb69db8f3fa968f3a9'
const sha = text => createHash('sha256').update(text).digest('hex')
const require = createRequire(`${repositoryRoot}/package.json`)
const ts = require('typescript')

if (!existsSync(candidatePath)) {
  throw new Error(`Missing candidate source ${candidatePath}`)
}

const sourceFile = (name, text) =>
  ts.createSourceFile(
    name,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

const htmlAttributeProperties = source => {
  let properties
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(source) === 'htmlAttributes'
    ) {
      let initializer = node.initializer
      if (!ts.isArrowFunction(initializer)) {
        throw new Error('htmlAttributes is no longer an arrow function')
      }
      initializer = initializer.body
      if (ts.isParenthesizedExpression(initializer)) {
        initializer = initializer.expression
      }
      if (!ts.isObjectLiteralExpression(initializer)) {
        throw new Error('htmlAttributes no longer returns an object literal')
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

const taggedEnumBinding = source => {
  let binding
  const visit = node => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isObjectBindingPattern(node.name) &&
      node.name.elements.some(
        element => element.name.getText(source) === 'Prop',
      ) &&
      node.initializer?.getText(source).startsWith('Data.taggedEnum<')
    ) {
      binding = node.name
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (binding === undefined) {
    throw new Error('Missing Attribute Data.taggedEnum binding')
  }
  return binding
}

const directText = execFileSync(
  'git',
  ['show', `${directHead}:packages/foldkit/src/html/index.ts`],
  { cwd: repositoryRoot, encoding: 'utf8' },
)
const candidateText = readFileSync(candidatePath, 'utf8')
if (sha(candidateText) !== expectedBaselineSha256) {
  throw new Error(
    `Candidate baseline hash changed: ${sha(candidateText)}; expected ${expectedBaselineSha256}`,
  )
}
if (sha(directText) !== expectedDirectSha256) {
  throw new Error(`PR #1575 source hash changed: ${sha(directText)}`)
}

const directSource = sourceFile('direct.ts', directText)
const candidateSource = sourceFile('candidate.ts', candidateText)
const directProperties = htmlAttributeProperties(directSource)
const candidateProperties = htmlAttributeProperties(candidateSource)
if (directProperties.size !== 313 || candidateProperties.size !== 313) {
  throw new Error(
    `Expected 313 HtmlAttributes, received ${directProperties.size} and ${candidateProperties.size}`,
  )
}

const replacements = []
for (const [name, candidateProperty] of candidateProperties) {
  if (name === 'OnMount') continue
  const directProperty = directProperties.get(name)
  if (
    directProperty === undefined ||
    !ts.isPropertyAssignment(candidateProperty) ||
    !ts.isPropertyAssignment(directProperty) ||
    !ts.isArrowFunction(candidateProperty.initializer) ||
    !ts.isArrowFunction(directProperty.initializer)
  ) {
    throw new Error(`Unsupported HtmlAttribute property ${name}`)
  }
  const candidateParameters = candidateProperty.initializer.parameters.map(
    parameter => parameter.name.getText(candidateSource),
  )
  const directParameters = directProperty.initializer.parameters.map(
    parameter => parameter.name.getText(directSource),
  )
  if (candidateParameters.join('\0') !== directParameters.join('\0')) {
    throw new Error(`${name} parameter names changed`)
  }
  replacements.push({
    start: candidateProperty.initializer.body.getStart(candidateSource),
    end: candidateProperty.initializer.body.end,
    text: directProperty.initializer.body.getText(directSource),
  })
}

const binding = taggedEnumBinding(candidateSource)
replacements.push({
  start: binding.getStart(candidateSource),
  end: binding.end,
  text: '{ Prop, OnCustomEvent }',
})

let nextText = candidateText
for (const replacement of replacements.sort(
  (left, right) => right.start - left.start,
)) {
  nextText =
    nextText.slice(0, replacement.start) +
    replacement.text +
    nextText.slice(replacement.end)
}
writeFileSync(candidatePath, nextText)
console.log(
  JSON.stringify(
    {
      adaptedConstructors: replacements.length - 1,
      preservedOnMount: true,
      output: candidatePath,
      unformattedSha256: sha(nextText),
    },
    null,
    2,
  ),
)
