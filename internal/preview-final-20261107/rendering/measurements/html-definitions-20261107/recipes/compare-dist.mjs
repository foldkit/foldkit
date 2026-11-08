import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const roots = {
  retained: '/private/tmp/foldkit-mount-iterative-20261107-32wcjI/baseline/packages/foldkit/dist',
  baseline: '/private/tmp/foldkit-html-definition-twins-20261107/baseline/packages/foldkit/dist',
  candidate: '/private/tmp/foldkit-html-definition-twins-20261107/candidate/packages/foldkit/dist',
}
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const manifest = root => {
  const files = new Map()
  const walk = directory => {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name)
      const stat = lstatSync(path)
      if (stat.isDirectory()) walk(path)
      else if (stat.isFile()) files.set(relative(root, path), sha256(readFileSync(path)))
    }
  }
  walk(root)
  return files
}
const manifests = Object.fromEntries(Object.entries(roots).map(([name, root]) => [name, manifest(root)]))
const compare = (leftName, rightName) => {
  const left = manifests[leftName]
  const right = manifests[rightName]
  const files = [...new Set([...left.keys(), ...right.keys()])].sort()
  const differences = files
    .filter(file => left.get(file) !== right.get(file))
    .map(file => ({ file, [leftName]: left.get(file) ?? null, [rightName]: right.get(file) ?? null }))
  return {
    leftFiles: left.size,
    rightFiles: right.size,
    differenceCount: differences.length,
    declarationDifferenceCount: differences.filter(({ file }) => file.endsWith('.d.ts') || file.endsWith('.d.ts.map')).length,
    differences,
  }
}
console.log(JSON.stringify({
  roots,
  retainedVsBaseline: compare('retained', 'baseline'),
  baselineVsCandidate: compare('baseline', 'candidate'),
}, null, 2))
