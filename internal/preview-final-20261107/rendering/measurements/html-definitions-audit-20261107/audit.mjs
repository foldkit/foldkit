import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const baselineRoot =
  '/private/tmp/foldkit-html-definition-twins-20261107/baseline/packages/foldkit'
const candidateRoot =
  '/private/tmp/foldkit-html-definition-twins-20261107/candidate/packages/foldkit'

const inputs = {
  baselineSource: {
    path: `${baselineRoot}/src/html/index.ts`,
    sha256: '3b2464b443db3614e03dda8e9285fbada713788d906c8c198ab23e7469eb06ac',
  },
  candidateSource: {
    path: `${candidateRoot}/src/html/index.ts`,
    sha256: '99424407549f6df602f055f3adf7c6f8a528b38f9f7d7002e1ba281d4baebc64',
  },
  candidateTest: {
    path: `${candidateRoot}/src/html/attributeConstruction.test.ts`,
    sha256: '0fd22257bc05b818c5167a9d22bd4aace9579da3cd8e4806298c80d557d2e878',
  },
  baselineDist: {
    path: `${baselineRoot}/dist/html/index.js`,
    sha256: '655c5d1a4ada635700726bf89288d8e43c963502c2084b05c9ee4acdeefd35b1',
  },
  candidateDist: {
    path: `${candidateRoot}/dist/html/index.js`,
    sha256: 'fca0c7e28dd04cac97205e02245d382e69dcf14ff91f86b70496918dad2fa6a5',
  },
  node: {
    path: '/Users/devinjameson/.vite-plus/bin/node',
    sha256: '362e3f002a58b6619e17f460d5bfccde65575d4da15c71022be3ca8fc9eb2993',
  },
}

const sha256 = async path =>
  createHash('sha256').update(await readFile(path)).digest('hex')

for (const [name, input] of Object.entries(inputs)) {
  assert.equal(await sha256(input.path), input.sha256, `${name} SHA-256`)
}
assert.equal(process.version, 'v26.13.0')
assert.equal(process.versions.v8, '14.6.202.34-node.40')
assert.equal(process.platform, 'darwin')
assert.equal(process.arch, 'arm64')

const baseline = await import(`file://${inputs.baselineDist.path}`)
const candidate = await import(`file://${inputs.candidateDist.path}`)
const baselineBuilder = baseline.__htmlBuilder()
const candidateBuilder = candidate.__htmlBuilder()

assert.deepStrictEqual(
  Reflect.ownKeys(candidateBuilder),
  Reflect.ownKeys(baselineBuilder),
  'complete builder own-key order',
)

const constructorNames = Reflect.ownKeys(baselineBuilder).filter(
  name =>
    typeof name === 'string' &&
    /^[A-Z]/.test(name) &&
    typeof baselineBuilder[name] === 'function' &&
    typeof candidateBuilder[name] === 'function',
)
assert.equal(constructorNames.length, 313)

const sentinel = Object.freeze({ sentinel: true })
const callback = (..._args) => sentinel
const mountAction = { name: 'AuditMount', f: callback }

const normalizeKey = key =>
  typeof key === 'symbol' ? `Symbol(${key.description ?? ''})` : key

const normalize = value => {
  if (value === sentinel) return '<sentinel>'
  if (value === callback) return '<callback>'
  if (value === mountAction) return '<mount-action>'
  if (typeof value === 'symbol') return normalizeKey(value)
  if (typeof value === 'function') return `<function:${value.name}:${value.length}>`
  if (value === null || typeof value !== 'object') return value

  return {
    prototype:
      Object.getPrototypeOf(value) === Object.prototype
        ? 'Object.prototype'
        : Object.getPrototypeOf(value) === Array.prototype
          ? 'Array.prototype'
          : Object.getPrototypeOf(value)?.constructor?.name ?? null,
    properties: Reflect.ownKeys(value).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      assert.notEqual(descriptor, undefined)
      return [
        normalizeKey(key),
        {
          configurable: descriptor.configurable,
          enumerable: descriptor.enumerable,
          ...(Object.hasOwn(descriptor, 'value')
            ? {
                value: normalize(descriptor.value),
                writable: descriptor.writable,
              }
            : {
                get: normalize(descriptor.get),
                set: normalize(descriptor.set),
              }),
        },
      ]
    }),
  }
}

const containsIdentity = (value, identity, seen = new Set()) => {
  if (value === identity) return true
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    return false
  }
  if (seen.has(value)) return false
  seen.add(value)
  return Reflect.ownKeys(value).some(key =>
    containsIdentity(value[key], identity, seen),
  )
}

const argumentsFor = (name, arity) =>
  name === 'OnMount'
    ? [mountAction]
    : name === 'OnClick'
      ? [sentinel, Object.freeze({ defaultAction: 'Prevent' })]
      : name === 'OnCancelPreventDefault'
        ? [sentinel]
        : name === 'AllowDrop'
          ? []
          : name === 'OnCopyText'
            ? ['audit']
            : name === 'OnCutText'
              ? ['audit', sentinel]
              : name === 'Attribute' || name === 'DataAttribute'
                ? ['audit-key', 'audit-value']
                : Array.from({ length: arity }, () =>
                    name.startsWith('On') ? callback : sentinel,
                  )

for (const name of constructorNames) {
  const baselineConstructor = baselineBuilder[name]
  const candidateConstructor = candidateBuilder[name]

  assert.equal(candidateConstructor.name, baselineConstructor.name, `${name} name`)
  assert.equal(
    candidateConstructor.length,
    baselineConstructor.length,
    `${name} arity`,
  )
  assert.deepStrictEqual(
    Reflect.ownKeys(candidateConstructor),
    Reflect.ownKeys(baselineConstructor),
    `${name} function own keys`,
  )
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(candidateConstructor, 'name'),
    Object.getOwnPropertyDescriptor(baselineConstructor, 'name'),
    `${name} name descriptor`,
  )
  assert.deepStrictEqual(
    Object.getOwnPropertyDescriptor(candidateConstructor, 'length'),
    Object.getOwnPropertyDescriptor(baselineConstructor, 'length'),
    `${name} length descriptor`,
  )
  assert.equal(
    Object.getPrototypeOf(candidateConstructor),
    Object.getPrototypeOf(baselineConstructor),
    `${name} function prototype`,
  )

  // This is an intentionally erased invocation audit. Runtime constructors do
  // not validate their TypeScript-only payload types; shared sentinels make
  // payload identity observable without duplicating 313 typed call sites.
  const args = argumentsFor(name, baselineConstructor.length)
  const baselineValue = Reflect.apply(baselineConstructor, undefined, args)
  const candidateValue = Reflect.apply(candidateConstructor, undefined, args)

  assert.deepStrictEqual(
    normalize(candidateValue),
    normalize(baselineValue),
    `${name} normalized result shape`,
  )
  assert.equal(
    Object.getPrototypeOf(candidateValue),
    Object.getPrototypeOf(baselineValue),
    `${name} result prototype`,
  )
  assert.equal(
    containsIdentity(candidateValue, sentinel),
    containsIdentity(baselineValue, sentinel),
    `${name} sentinel identity`,
  )
  assert.equal(
    containsIdentity(candidateValue, callback),
    containsIdentity(baselineValue, callback),
    `${name} callback identity`,
  )
  assert.notEqual(
    Reflect.apply(candidateConstructor, undefined, args),
    candidateValue,
    `${name} fresh result`,
  )
}

for (const name of ['Prop', 'OnCustomEvent']) {
  assert.equal(typeof baseline[name], 'function')
  assert.equal(typeof candidate[name], 'function')
  assert.equal(name in baselineBuilder, false)
  assert.equal(name in candidateBuilder, false)
}

const propPayload = { key: 'audit', value: sentinel }
assert.deepStrictEqual(
  normalize(candidate.Prop(propPayload)),
  normalize(baseline.Prop(propPayload)),
  'raw Prop result',
)
const eventPayload = { name: 'audit', f: callback }
assert.deepStrictEqual(
  normalize(candidate.OnCustomEvent(eventPayload)),
  normalize(baseline.OnCustomEvent(eventPayload)),
  'raw OnCustomEvent result',
)

for (const args of [[sentinel], []]) {
  assert.deepStrictEqual(
    normalize(Reflect.apply(candidateBuilder.OnCancelPreventDefault, undefined, args)),
    normalize(Reflect.apply(baselineBuilder.OnCancelPreventDefault, undefined, args)),
    `OnCancelPreventDefault ${args.length === 0 ? 'empty' : 'present'}`,
  )
}
assert.deepStrictEqual(
  normalize(candidateBuilder.OnClick(sentinel)),
  normalize(baselineBuilder.OnClick(sentinel)),
  'OnClick without options',
)

const candidateMount = candidateBuilder.OnMount(mountAction)
assert.deepStrictEqual(Reflect.ownKeys(candidateMount), ['_tag', 'action'])
assert.equal(candidateMount.action.name, mountAction.name)
assert.equal(candidateMount.action.f, callback)
assert.deepStrictEqual(candidate.mountOccurrencePath(candidateMount.action), [])

console.log(
  JSON.stringify(
    {
      status: 'pass',
      constructors: constructorNames.length,
      rawExceptions: ['Prop', 'OnCustomEvent'],
      builderOwnKeys: Reflect.ownKeys(candidateBuilder).length,
      onMountNormalization:
        'Module-private MountOccurrencePath symbols are compared by description and descriptors; each module intentionally owns a distinct symbol identity.',
      inputSha256: Object.fromEntries(
        Object.entries(inputs).map(([name, input]) => [name, input.sha256]),
      ),
      node: {
        version: process.version,
        v8: process.versions.v8,
        platform: process.platform,
        arch: process.arch,
      },
    },
    null,
    2,
  ),
)
