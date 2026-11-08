import fs from 'node:fs'

const candidatePath = '/private/tmp/foldkit-html-definitions-20261107/packages/foldkit/src/html/index.ts'
const theirsPath = '/private/tmp/foldkit-html-definitions-refs/theirs/packages/foldkit/src/html/index.ts'
const currentPath = '/private/tmp/foldkit-mount-iterative-20261107-32wcjI/baseline/packages/foldkit/src/html/index.ts'

const merged = fs.readFileSync(candidatePath, 'utf8')
const theirs = fs.readFileSync(theirsPath, 'utf8')
const current = fs.readFileSync(currentPath, 'utf8')

const conflictPattern = /^<<<<<<< .*?\n([\s\S]*?)(?:^\|\|\|\|\|\|\| .*?\n([\s\S]*?))?^=======\n([\s\S]*?)^>>>>>>> .*?$/gm
let conflict = 0
let resolved = merged.replace(conflictPattern, (_match, ours, _base, theirSection) => {
  conflict += 1
  switch (conflict) {
    case 1:
      return theirSection
    case 2:
      return theirSection
        .replaceAll('Attribute<unknown>', 'TaggedAttribute<unknown, any>')
        .replaceAll('HtmlAttributes<unknown>', 'HtmlAttributes<unknown, any>')
    case 3:
      return '__ATTRIBUTE_DEFINITIONS__\n'
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    case 10:
      return ''
    case 11:
      return theirSection
        .replaceAll('HtmlElements<unknown>', 'HtmlElements<unknown, unknown>')
        .replace(
          'const htmlElements = <Message>(): HtmlElements<Message> => {\n  const el = element<Message>()\n  const voidEl = voidElement<Message>()',
          'const htmlElements = <Message, AllowedMountRequirements>(): HtmlElements<\n  Message,\n  AllowedMountRequirements\n> => {\n  const el = element<Message, AllowedMountRequirements>()\n  const voidEl = voidElement<Message, AllowedMountRequirements>()',
        )
        .replace(
          '  ) as HtmlElements<Message>',
          '  ) as HtmlElements<Message, AllowedMountRequirements>',
        )
    case 12:
      return ours.slice(0, ours.indexOf('\nconst htmlAttributes =')) + '\n'
    default:
      throw new Error(`Unexpected conflict ${conflict}`)
  }
})

if (conflict !== 12) throw new Error(`Expected 12 conflicts, found ${conflict}`)

const definitionsStart = theirs.indexOf('const makeValueAttribute =')
const definitionsEnd = theirs.indexOf('// NOTE: resolve the shared definitions once', definitionsStart)
if (definitionsStart < 0 || definitionsEnd < 0) throw new Error('Could not find #1585 definition block')
let definitions = theirs.slice(definitionsStart, definitionsEnd)

definitions = definitions
  .replaceAll('Attribute<unknown>', 'TaggedAttribute<unknown, any>')
  .replaceAll('HtmlAttributes<unknown>', 'HtmlAttributes<unknown, any>')

const currentMountHandlerStart = current.indexOf('  OnMount: ({ action }, ctx) => {')
const currentUnmountHandlerStart = current.indexOf('  OnUnmount: ({ message }, ctx: BuildContext) => {', currentMountHandlerStart)
const currentHandlersEnd = current.indexOf('\n}', currentUnmountHandlerStart)
if (currentMountHandlerStart < 0 || currentUnmountHandlerStart < 0 || currentHandlersEnd < 0) {
  throw new Error('Could not find current Mount handlers')
}
let currentMountHandler = current.slice(currentMountHandlerStart, currentUnmountHandlerStart)
currentMountHandler = currentMountHandler
  .replace(
    '  OnMount: ({ action }, ctx) => {',
    '  OnMount: [\n    makeMountAttribute,\n    ({ action }, ctx) => {',
  )
  .replace(/  },\n$/, '    },\n  ],\n')
let currentUnmountHandler = current.slice(currentUnmountHandlerStart, currentHandlersEnd)
currentUnmountHandler = currentUnmountHandler
  .replace(
    '  OnUnmount: ({ message }, ctx: BuildContext) => {',
    '  OnUnmount: [\n    makeMessageAttribute,\n    ({ message }, ctx: BuildContext) => {',
  )
  .replace(/  },$/, '    },\n  ],')

const oldMountDefinitionsStart = definitions.indexOf('  OnMount: [')
const oldMountDefinitionsEnd = definitions.indexOf('\n}', oldMountDefinitionsStart)
if (oldMountDefinitionsStart < 0 || oldMountDefinitionsEnd < 0) {
  throw new Error('Could not find historical Mount definitions')
}
definitions =
  definitions.slice(0, oldMountDefinitionsStart) +
  currentMountHandler +
  currentUnmountHandler +
  definitions.slice(oldMountDefinitionsEnd)

const currentConstructorStart = current.indexOf('  OnMount: action => {', current.indexOf('const htmlAttributes ='))
const currentConstructorEnd = current.indexOf('\n  /**', currentConstructorStart)
if (currentConstructorStart < 0 || currentConstructorEnd < 0) {
  throw new Error('Could not find current OnMount constructor')
}
let makeMountAttribute = current.slice(currentConstructorStart, currentConstructorEnd)
makeMountAttribute = makeMountAttribute
  .replace(
    '  OnMount: action => {',
    "const makeMountAttribute =\n  (tag: 'OnMount') =>\n  <Message, Error, Requirements>(\n    action: MountAction<Message, Error, Requirements>,\n  ) => {",
  )
  .replace("    return { _tag: 'OnMount', action: capturedAction }", '    return { _tag: tag, action: capturedAction }')
  .replace(/\n  },$/, '\n  }')

definitions = definitions.replace(
  /const makeMountAttribute =[\s\S]*?const makeKeyValueAttribute =/,
  `${makeMountAttribute}\nconst makeKeyValueAttribute =`,
)

for (const tag of [
  'OnKeyDown',
  'OnKeyDownPreventDefault',
  'OnKeyDownSelf',
  'OnKeyDownSelfPreventDefault',
  'OnKeyDownFocus',
]) {
  const tagStart = definitions.indexOf(`  ${tag}: [`)
  const nextTag = definitions.indexOf('\n  ', tagStart + 3)
  const end = nextTag < 0 ? definitions.length : nextTag
  const section = definitions.slice(tagStart, end)
  const updated = section.replace(
    /keydown: \(event: KeyboardEvent\) => \{/,
    'keydown: skipImeCompositionKeydown(event => {',
  ).replace(/\n        },\n      }\),?$/, '\n        }),\n      }),')
  definitions = definitions.slice(0, tagStart) + updated + definitions.slice(end)
}

const sentinel = resolved.indexOf('__ATTRIBUTE_DEFINITIONS__')
const handlersMarker = resolved.indexOf('// NOTE: resolve the shared definitions once', sentinel)
if (sentinel < 0 || handlersMarker < 0) throw new Error('Could not replace merged definition region')
resolved = resolved.slice(0, sentinel) + definitions + resolved.slice(handlersMarker)

resolved = resolved
  .replace(
    'const htmlAttributes = <Message>(): HtmlAttributes<Message> => {',
    'const htmlAttributes = <Message, AllowedMountRequirements>(): HtmlAttributes<\n  Message,\n  AllowedMountRequirements\n> => {',
  )
  .replace(
    '  return Object.fromEntries(constructors) as HtmlAttributes<Message>',
    '  return Object.fromEntries(constructors) as HtmlAttributes<\n    Message,\n    AllowedMountRequirements\n  >',
  )

if (/^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)/m.test(resolved)) {
  throw new Error('Conflict marker remains')
}
fs.writeFileSync(candidatePath, resolved)
