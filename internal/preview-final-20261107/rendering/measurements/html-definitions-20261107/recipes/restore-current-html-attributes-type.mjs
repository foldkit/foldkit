import fs from 'node:fs'

const baseline = '/private/tmp/foldkit-html-definition-twins-20261107/baseline/packages/foldkit/src/html/index.ts'
const candidates = [
  '/private/tmp/foldkit-html-definition-twins-20261107/candidate/packages/foldkit/src/html/index.ts',
  '/private/tmp/foldkit-html-definitions-20261107/packages/foldkit/src/html/index.ts',
]
const current = fs.readFileSync(baseline, 'utf8')
const startMarker = 'type HtmlAttributes<Message, AllowedMountRequirements> = {'
const endMarker = 'const htmlAttributes = <Message, AllowedMountRequirements>()'
const start = current.indexOf(startMarker)
const end = current.indexOf(endMarker, start)
if (start < 0 || end < 0) throw new Error('Baseline HtmlAttributes region not found')
const currentType = current.slice(start, end)

for (const file of candidates) {
  let source = fs.readFileSync(file, 'utf8')
  const candidateStart = source.indexOf(startMarker)
  const candidateEnd = source.indexOf(endMarker, candidateStart)
  if (candidateStart < 0 || candidateEnd < 0) throw new Error(`Candidate region not found: ${file}`)
  source = source.slice(0, candidateStart) + currentType + source.slice(candidateEnd)
  fs.writeFileSync(file, source)
}
