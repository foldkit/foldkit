import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { test } from 'node:test'

import {
  NpmRegistry,
  assertArtifactsMatchPackages,
  assertPackagesAlreadyExist,
  canaryVersion,
  createNpmTagger,
  dispatchReleaseFinalization,
  packagesForChannel,
  packagesToUpload,
  promoteAndFinalizeCurrentWorkspace,
  promoteSnapshot,
  promptForNpmOtp,
  resolveReleaseCommit,
  uploadArtifacts,
  uploadPlannedArtifacts,
  uploadTag,
  uploadedPackageMessage,
  verifyRegistrySnapshot,
  verifyStableReleaseCommit,
  waitForTaggedSnapshot,
} from './coherent-release.mjs'

const packageFor = (name, version, extra = {}) => ({
  packageJson: { name, version, ...extra },
})

const artifactFor = (name, version) => ({
  name,
  version,
  integrity: `sha512-${name}-${version}`,
})

class FakeRegistry {
  constructor(packages) {
    this.packuments = new Map()
    this.versions = new Map()

    for (const pkg of packages) {
      this.packuments.set(pkg.packageJson.name, {
        name: pkg.packageJson.name,
        'dist-tags': {},
      })
    }
  }

  key(name, version) {
    return `${name}@${version}`
  }

  async packument(name) {
    return this.packuments.get(name)
  }

  async version(name, version) {
    return this.versions.get(this.key(name, version))
  }

  add(artifact, extra = {}) {
    this.versions.set(this.key(artifact.name, artifact.version), {
      name: artifact.name,
      version: artifact.version,
      dist: { integrity: artifact.integrity },
      ...extra,
    })
  }
}

test('a partial upload retries without republishing completed versions', async () => {
  const packages = [
    packageFor('foldkit', '1.0.0'),
    packageFor('@foldkit/ui', '1.0.0'),
  ]
  const artifacts = packages.map(pkg =>
    artifactFor(pkg.packageJson.name, pkg.packageJson.version),
  )
  const registry = new FakeRegistry(packages)
  const attempts = []

  await assert.rejects(
    uploadArtifacts({
      artifacts,
      registry,
      publish: async artifact => {
        attempts.push(artifact.name)
        if (artifact.name === '@foldkit/ui') {
          throw new Error('simulated registry failure')
        }
        registry.add(artifact)
      },
      attempts: 1,
      delayMilliseconds: 0,
    }),
    /simulated registry failure/,
  )

  const retry = await uploadArtifacts({
    artifacts,
    registry,
    publish: async artifact => {
      attempts.push(artifact.name)
      registry.add(artifact)
    },
    attempts: 1,
    delayMilliseconds: 0,
  })

  assert.deepEqual(attempts, ['foldkit', '@foldkit/ui', '@foldkit/ui'])
  assert.deepEqual(retry.published, ['@foldkit/ui'])
  assert.deepEqual(retry.skipped, ['foldkit'])
})

test('stable planning uploads only untagged or missing registry versions', () => {
  const packages = [
    packageFor('foldkit', '1.0.0'),
    packageFor('@foldkit/ui', '1.0.0'),
    packageFor('@foldkit/devtools', '1.0.0'),
  ]
  const planned = packagesToUpload({
    packages: packagesForChannel(packages, 'stable', 'unused'),
    channel: 'stable',
    knownTags: new Set(['foldkit@1.0.0', '@foldkit/ui@1.0.0']),
    metadataByName: new Map([
      ['foldkit', { version: '1.0.0' }],
      ['@foldkit/ui', undefined],
      ['@foldkit/devtools', undefined],
    ]),
  })

  assert.deepEqual(
    planned.map(pkg => pkg.packageJson.name),
    ['@foldkit/ui', '@foldkit/devtools'],
  )
})

test('a retry rejects an existing version with different bytes', async () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const registry = new FakeRegistry(packages)
  const artifact = artifactFor('foldkit', '1.0.0')
  registry.add({ ...artifact, integrity: 'sha512-different' })

  await assert.rejects(
    uploadArtifacts({
      artifacts: [artifact],
      registry,
      publish: async () => assert.fail('publish should not run'),
    }),
    /does not match the packed artifact/,
  )
})

test('registry verification covers the complete internal dependency graph', async () => {
  const packages = [
    packageFor('foldkit', '1.2.3'),
    packageFor('@foldkit/ui', '1.2.3'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', '1.2.3'))
  registry.add(artifactFor('@foldkit/ui', '1.2.3'), {
    peerDependencies: { foldkit: '^1.2.0' },
  })

  await verifyRegistrySnapshot(packages, registry)

  registry.versions.get('@foldkit/ui@1.2.3').peerDependencies.foldkit = '^2.0.0'
  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /does not accept 1.2.3/,
  )
  registry.versions.delete('foldkit@1.2.3')
  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /registry is missing foldkit@1.2.3/,
  )
})

test('registry verification derives internal package names from the release set', async () => {
  const packages = [
    packageFor('public-core', '1.0.0'),
    packageFor('public-consumer', '1.0.0'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('public-core', '1.0.0'))
  registry.add(artifactFor('public-consumer', '1.0.0'), {
    dependencies: { 'public-core': '^2.0.0' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /does not accept 1.0.0/,
  )
})

test('registry verification rejects any workspace dependency outside the public snapshot', async () => {
  const packages = [packageFor('public-consumer', '1.0.0')]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('public-consumer', '1.0.0'), {
    dependencies: { 'private-helper': 'workspace:*' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(
      packages,
      registry,
      new Set(['public-consumer', 'private-helper']),
    ),
    /references private-helper outside the coherent public package set/,
  )
})

test('an artifact mismatch stops before the first publication', async () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const registry = new FakeRegistry(packages)
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('unexpected-package', '1.0.0'),
            packageJson: {
              name: 'unexpected-package',
              version: '1.0.0',
            },
          },
        ],
        packages,
        releasePackages: packages,
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /unexpected artifact unexpected-package@1.0.0/,
  )
  assert.deepEqual(attempted, [])
})

test('a missing packed dependency stops before the first publication', async () => {
  const core = packageFor('core', '1.0.0')
  const consumer = packageFor('consumer', '1.0.0', {
    dependencies: { core: 'workspace:*' },
  })
  const registry = new FakeRegistry([core, consumer])
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: { name: 'consumer', version: '1.0.0' },
          },
        ],
        packages: [consumer],
        releasePackages: [core, consumer],
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /packed dependencies keys.*, expected core/,
  )
  assert.deepEqual(attempted, [])
})

test('packed artifacts preserve non-workspace dependency specs', () => {
  const packages = [
    packageFor('consumer', '1.0.0', {
      dependencies: { semver: '^7.7.4' },
    }),
  ]

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              dependencies: { semver: '^8.0.0' },
            },
          },
        ],
        packages,
        releasePackages: packages,
      }),
    /packed dependencies.semver=\^8.0.0, expected \^7.7.4 from \^7.7.4/,
  )
})

test('a weakened internal range stops before the first publication', async () => {
  const core = packageFor('core', '1.0.0')
  const consumer = packageFor('consumer', '1.0.0', {
    peerDependencies: { core: '^1.0.0' },
  })
  const registry = new FakeRegistry([core, consumer])
  const attempted = []

  await assert.rejects(
    () =>
      uploadPlannedArtifacts({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              peerDependencies: { core: '*' },
            },
          },
        ],
        packages: [consumer],
        releasePackages: [core, consumer],
        registry,
        publish: async artifact => attempted.push(artifact.name),
        attempts: 1,
        delayMilliseconds: 0,
      }),
    /packed peerDependencies.core=\*, expected \^1.0.0/,
  )
  assert.deepEqual(attempted, [])
})

test('packed artifacts use pnpm workspace protocol transformations', () => {
  const releasePackages = [
    packageFor('star-core', '1.2.3'),
    packageFor('caret-core', '1.2.3'),
    packageFor('zero-core', '0.148.0'),
  ]
  const consumer = packageFor('consumer', '1.0.0', {
    dependencies: {
      'star-core': 'workspace:*',
      'caret-core': 'workspace:^',
      'zero-core': 'workspace:^0',
    },
  })

  assert.doesNotThrow(() =>
    assertArtifactsMatchPackages({
      artifacts: [
        {
          ...artifactFor('consumer', '1.0.0'),
          packageJson: {
            name: 'consumer',
            version: '1.0.0',
            dependencies: {
              'star-core': '1.2.3',
              'caret-core': '^1.2.3',
              'zero-core': '^0',
            },
          },
        },
      ],
      packages: [consumer],
      releasePackages: [...releasePackages, consumer],
    }),
  )

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [
          {
            ...artifactFor('consumer', '1.0.0'),
            packageJson: {
              name: 'consumer',
              version: '1.0.0',
              dependencies: {
                'star-core': '*',
                'caret-core': '^1.2.3',
                'zero-core': '^0',
              },
            },
          },
        ],
        packages: [consumer],
        releasePackages: [...releasePackages, consumer],
      }),
    /packed dependencies.star-core=\*, expected 1.2.3 from workspace:\*/,
  )
})

test('packed artifacts reject duplicate planned packages', () => {
  const packages = [packageFor('foldkit', '1.0.0')]
  const artifact = {
    ...artifactFor('foldkit', '1.0.0'),
    packageJson: { name: 'foldkit', version: '1.0.0' },
  }

  assert.throws(
    () =>
      assertArtifactsMatchPackages({
        artifacts: [artifact, artifact],
        packages,
        releasePackages: packages,
      }),
    /duplicate artifacts for foldkit/,
  )
})

test('canary versions and internal references are commit-addressed', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const packages = packagesForChannel(
    [
      packageFor('foldkit', '1.2.3'),
      packageFor('@foldkit/ui', '1.2.3', {
        peerDependencies: { foldkit: 'workspace:^0' },
      }),
    ],
    'canary',
    commit,
  )

  assert.equal(canaryVersion('1.2.3', commit), '1.2.3-canary.0123456789ab')
  assert.equal(
    packages[1].packageJson.peerDependencies.foldkit,
    '1.2.3-canary.0123456789ab',
  )
  assert.equal(
    uploadTag('canary', commit),
    'foldkit-canary-upload-0123456789ab',
  )
  assert.deepEqual(
    packagesToUpload({
      packages,
      channel: 'canary',
      knownTags: new Set(),
      metadataByName: new Map(),
    }),
    packages,
  )
})

test('stable upload output does not use Changesets reserved tag protocol', () => {
  const pkg = packageFor('foldkit', '1.2.3')
  const message = uploadedPackageMessage('stable', pkg)

  assert.equal(message, 'Uploaded and verified foldkit@1.2.3')
  assert.doesNotMatch(message, /^New tag:/)
  assert.equal(uploadedPackageMessage('canary', pkg), 'foldkit@1.2.3')
})

test('registry verification requires exact internal canary references', async () => {
  const version = '1.2.3-canary.0123456789ab'
  const packages = [
    packageFor('foldkit', version),
    packageFor('@foldkit/ui', version),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', version))
  registry.add(artifactFor('@foldkit/ui', version), {
    peerDependencies: { foldkit: '>=1.2.3-canary.0123456789ab' },
  })

  await assert.rejects(
    verifyRegistrySnapshot(packages, registry),
    /not the exact canary version/,
  )
})

test('canary upload refuses a package name npm has never published', async () => {
  const packages = [packageFor('@foldkit/new-package', '0.1.0')]
  const registry = new FakeRegistry([])

  await assert.rejects(
    assertPackagesAlreadyExist(packages, registry),
    /refusing first publication.*@foldkit\/new-package/,
  )
})

test('partial tag promotion resumes idempotently', async () => {
  const packages = [
    packageFor('foldkit', '1.2.3'),
    packageFor('create-foldkit-app', '2.0.0'),
  ]
  const registry = new FakeRegistry(packages)

  for (const pkg of packages) {
    registry.add(artifactFor(pkg.packageJson.name, pkg.packageJson.version))
  }

  registry.add(artifactFor('foldkit', '1.2.2'))
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.2.2'
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  let isFirstAttempt = true
  const addTag = async (pkg, tag) => {
    if (pkg.packageJson.name === 'foldkit' && isFirstAttempt) {
      throw new Error('simulated promotion failure')
    }
    registry.packuments.get(pkg.packageJson.name)['dist-tags'][tag] =
      pkg.packageJson.version
  }

  await assert.rejects(
    promoteSnapshot({ packages, tag: 'latest', registry, addTag }),
    /simulated promotion failure/,
  )
  assert.equal(
    registry.packuments.get('create-foldkit-app')['dist-tags'].latest,
    '2.0.0',
  )

  isFirstAttempt = false
  const retry = await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag,
  })
  assert.deepEqual(retry.alreadyPromoted, ['create-foldkit-app'])
  assert.deepEqual(retry.promoted, ['foldkit'])
})

test('promotion keeps every intermediate latest snapshot compatible', async () => {
  const packages = [
    packageFor('@foldkit/ui', '0.149.0', {
      peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
    }),
    packageFor('create-foldkit-app', '2.0.0'),
    packageFor('foldkit', '0.149.0'),
  ]
  const registry = new FakeRegistry(packages)

  for (const pkg of packages) {
    registry.add(artifactFor(pkg.packageJson.name, pkg.packageJson.version))
  }

  registry.add(artifactFor('@foldkit/ui', '0.149.0'), {
    peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
  })
  registry.add(artifactFor('@foldkit/ui', '0.148.0'), {
    peerDependencies: { foldkit: '^0.148.0' },
  })
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.add(artifactFor('foldkit', '0.148.0'))
  registry.packuments.get('@foldkit/ui')['dist-tags'].latest = '0.148.0'
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  registry.packuments.get('foldkit')['dist-tags'].latest = '0.148.0'
  const promoted = []

  await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag: async (pkg, tag) => {
      promoted.push(pkg.packageJson.name)
      registry.packuments.get(pkg.packageJson.name)['dist-tags'][tag] =
        pkg.packageJson.version
    },
  })

  assert.deepEqual(promoted, ['create-foldkit-app', '@foldkit/ui', 'foldkit'])
})

test('promotion stops before changing tags when no compatible path exists', async () => {
  const packages = [
    packageFor('foldkit', '0.149.0'),
    packageFor('@foldkit/ui', '0.149.0', {
      peerDependencies: { foldkit: '^0.149.0' },
    }),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', '0.149.0'))
  registry.add(artifactFor('@foldkit/ui', '0.149.0'), {
    peerDependencies: { foldkit: '^0.149.0' },
  })
  registry.add(artifactFor('foldkit', '0.148.0'))
  registry.add(artifactFor('@foldkit/ui', '0.148.0'), {
    peerDependencies: { foldkit: '^0.148.0' },
  })
  registry.packuments.get('foldkit')['dist-tags'].latest = '0.148.0'
  registry.packuments.get('@foldkit/ui')['dist-tags'].latest = '0.148.0'
  const attempted = []

  await assert.rejects(
    promoteSnapshot({
      packages,
      tag: 'latest',
      registry,
      addTag: async pkg => attempted.push(pkg.packageJson.name),
    }),
    /no dependency-compatible dist-tag order exists/,
  )
  assert.deepEqual(attempted, [])
})

test('promotion refuses every backward tag before changing any tag', async () => {
  const packages = [
    packageFor('create-foldkit-app', '2.0.0'),
    packageFor('foldkit', '1.2.3'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('create-foldkit-app', '2.0.0'))
  registry.add(artifactFor('create-foldkit-app', '1.9.0'))
  registry.add(artifactFor('foldkit', '1.2.3'))
  registry.add(artifactFor('foldkit', '1.3.0'))
  registry.packuments.get('create-foldkit-app')['dist-tags'].latest = '1.9.0'
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.3.0'
  const attempted = []

  await assert.rejects(
    promoteSnapshot({
      packages,
      tag: 'latest',
      registry,
      addTag: async pkg => attempted.push(pkg.packageJson.name),
    }),
    /refusing to move foldkit@latest backward.*No tags were changed/,
  )
  assert.deepEqual(attempted, [])
})

test('promotion waits for each dependency-ordered tag to propagate', async () => {
  const packages = [
    packageFor('@foldkit/ui', '0.149.0', {
      peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
    }),
    packageFor('foldkit', '0.149.0'),
  ]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('@foldkit/ui', '0.148.0'), {
    peerDependencies: { foldkit: '^0.148.0' },
  })
  registry.add(artifactFor('@foldkit/ui', '0.149.0'), {
    peerDependencies: { foldkit: '>=0.148.0 <0.150.0' },
  })
  registry.add(artifactFor('foldkit', '0.148.0'))
  registry.add(artifactFor('foldkit', '0.149.0'))
  registry.packuments.get('@foldkit/ui')['dist-tags'].latest = '0.148.0'
  registry.packuments.get('foldkit')['dist-tags'].latest = '0.148.0'
  const readPackument = registry.packument.bind(registry)
  const promoted = []
  let isUiPending = false
  let pendingUiReads = 0

  registry.packument = async name => {
    const packument = await readPackument(name)

    if (name === '@foldkit/ui' && isUiPending) {
      pendingUiReads += 1

      if (pendingUiReads === 2) {
        packument['dist-tags'].latest = '0.149.0'
        isUiPending = false
      }
    }

    return packument
  }

  await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag: async (pkg, tag) => {
      const name = pkg.packageJson.name

      if (name === 'foldkit') {
        assert.equal(
          registry.packuments.get('@foldkit/ui')['dist-tags'].latest,
          '0.149.0',
        )
      }

      promoted.push(name)

      if (name === '@foldkit/ui') {
        isUiPending = true
      } else {
        registry.packuments.get(name)['dist-tags'][tag] =
          pkg.packageJson.version
      }
    },
    attempts: 2,
    delayMilliseconds: 0,
  })

  assert.deepEqual(promoted, ['@foldkit/ui', 'foldkit'])
  assert.equal(pendingUiReads, 2)
})

test('tag propagation verification fails after its bounded retries', async () => {
  const packages = [packageFor('foldkit', '1.2.3')]
  const registry = new FakeRegistry(packages)
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.2.2'
  let reads = 0
  const readPackument = registry.packument.bind(registry)

  registry.packument = async name => {
    reads += 1

    return readPackument(name)
  }

  await assert.rejects(
    waitForTaggedSnapshot({
      packages,
      tag: 'latest',
      registry,
      attempts: 2,
      delayMilliseconds: 0,
    }),
    /registry did not expose the complete latest snapshot.*foldkit@latest is 1.2.2, expected 1.2.3/,
  )
  assert.equal(reads, 2)
})

test('promotion retries a transient registry read without repeating the tag change', async () => {
  const packages = [packageFor('foldkit', '1.2.3')]
  const registry = new FakeRegistry(packages)
  registry.add(artifactFor('foldkit', '1.2.2'))
  registry.add(artifactFor('foldkit', '1.2.3'))
  registry.packuments.get('foldkit')['dist-tags'].latest = '1.2.2'
  const readPackument = registry.packument.bind(registry)
  let isPromoted = false
  let postPromotionReads = 0
  let tagChanges = 0

  registry.packument = async name => {
    if (isPromoted) {
      postPromotionReads += 1

      if (postPromotionReads === 1) {
        throw new Error('temporary registry read failure')
      }
    }

    return readPackument(name)
  }

  await promoteSnapshot({
    packages,
    tag: 'latest',
    registry,
    addTag: async (pkg, tag) => {
      tagChanges += 1
      registry.packuments.get(pkg.packageJson.name)['dist-tags'][tag] =
        pkg.packageJson.version
      isPromoted = true
    },
    attempts: 2,
    delayMilliseconds: 0,
  })

  assert.equal(tagChanges, 1)
  assert.equal(postPromotionReads, 3)
})

test('npm registry requests abort when a read never settles', async () => {
  const testTimeoutMilliseconds = 50
  let isAborted = false
  let testTimeout
  const registry = new NpmRegistry('https://registry.example', {
    requestTimeoutMilliseconds: 1,
    fetchRegistry: (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            isAborted = true
            reject(signal.reason)
          },
          { once: true },
        )
      }),
  })

  const testGuard = new Promise((_resolve, reject) => {
    testTimeout = setTimeout(
      () => reject(new Error('test timed out before the registry request')),
      testTimeoutMilliseconds,
    )
  })

  try {
    await assert.rejects(
      Promise.race([registry.packument('foldkit'), testGuard]),
      /registry request timed out for foldkit/,
    )
  } finally {
    clearTimeout(testTimeout)
  }

  assert.equal(isAborted, true)
})

test('npm tag changes share one OTP without exposing it in arguments', async () => {
  const calls = []
  let prompts = 0
  const tagPackage = createNpmTagger({
    env: { PATH: '/usr/bin' },
    promptForOtp: async () => {
      prompts += 1

      return '123456'
    },
    run: (command, args, options) => {
      calls.push({ command, args, options })
    },
  })

  await tagPackage(packageFor('foldkit', '1.2.3'), 'latest')
  await tagPackage(packageFor('@foldkit/ui', '1.2.3'), 'latest')

  assert.equal(prompts, 1)
  assert.deepEqual(
    calls.map(({ command, args }) => [command, ...args]),
    [
      ['npm', 'dist-tag', 'add', 'foldkit@1.2.3', 'latest'],
      ['npm', 'dist-tag', 'add', '@foldkit/ui@1.2.3', 'latest'],
    ],
  )

  for (const call of calls) {
    assert.equal(call.options.inherit, true)
    assert.equal(call.options.env.NPM_CONFIG_OTP, '123456')
    assert.doesNotMatch(call.args.join(' '), /123456/)
  }
})

test('npm tag changes honor a supplied OTP without prompting', async () => {
  let prompts = 0
  let receivedEnvironment
  const tagPackage = createNpmTagger({
    env: {
      NPM_CONFIG_OTP: '654321',
      npm_config_otp: 'lowercase-secret',
      PATH: '/usr/bin',
    },
    promptForOtp: async () => {
      prompts += 1

      return 'unexpected'
    },
    run: (_command, _args, options) => {
      receivedEnvironment = options.env
    },
  })

  await tagPackage(packageFor('foldkit', '1.2.3'), 'latest')

  assert.equal(prompts, 0)
  assert.deepEqual(receivedEnvironment, {
    NPM_CONFIG_OTP: '654321',
    PATH: '/usr/bin',
  })
})

test('interactive npm OTP input is not echoed', async () => {
  const input = new PassThrough()
  const output = new PassThrough()
  let outputText = ''

  input.isTTY = true
  input.isRaw = false
  input.setRawMode = isRaw => {
    input.isRaw = isRaw

    return input
  }
  output.on('data', chunk => {
    outputText += chunk.toString()
  })

  const otpPromise = promptForNpmOtp({ input, output })
  input.write('123456\n')

  assert.equal(await otpPromise, '123456')
  assert.equal(outputText, 'npm OTP: \n')
  assert.doesNotMatch(outputText, /123456/)

  input.end()
  output.end()
})

test('release promotion resolves an exact commit from a clean checkout', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const calls = []
  const environment = {
    NPM_CONFIG_OTP: 'uppercase-secret',
    npm_config_otp: 'lowercase-secret',
    PATH: '/usr/bin',
  }
  const run = (command, args, options) => {
    calls.push({ command, args, options })

    if (args.includes('status')) {
      return { stdout: '' }
    }

    return { stdout: `${commit}\n` }
  }

  assert.equal(resolveReleaseCommit('/repo', run, environment), commit)
  assert.deepEqual(calls, [
    {
      command: 'git',
      args: ['status', '--short'],
      options: { cwd: '/repo', env: { PATH: '/usr/bin' } },
    },
    {
      command: 'git',
      args: ['rev-parse', 'HEAD'],
      options: { cwd: '/repo', env: { PATH: '/usr/bin' } },
    },
  ])

  assert.throws(
    () =>
      resolveReleaseCommit('/repo', () => ({
        stdout: '?? packages/untracked/package.json\n',
      })),
    /requires a clean checkout/,
  )
})

test('stable promotion validates the release commit on current main', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const environment = {
    NPM_CONFIG_OTP: 'uppercase-secret',
    PATH: '/usr/bin',
  }
  const workspacePackages = [packageFor('foldkit', '1.2.3')]
  const repository = {}
  const calls = []
  const derived = []
  const run = (command, args, options) => {
    calls.push({ command, args, options })

    return {
      stdout: args.includes('branch') ? 'origin/main\n' : '',
    }
  }

  verifyStableReleaseCommit({
    root: '/repo',
    commit,
    env: environment,
    run,
    workspacePackages,
    git: repository,
    deriveReleasePackages: options => {
      derived.push(options)

      return { commit, packages: [{ name: 'foldkit', version: '1.2.3' }] }
    },
  })

  assert.deepEqual(calls, [
    {
      command: 'git',
      args: ['fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main'],
      options: { cwd: '/repo', env: { PATH: '/usr/bin' } },
    },
    {
      command: 'git',
      args: [
        'branch',
        '--remotes',
        '--contains',
        commit,
        '--format=%(refname:short)',
      ],
      options: { cwd: '/repo', env: { PATH: '/usr/bin' } },
    },
  ])
  assert.deepEqual(derived, [
    {
      root: '/repo',
      publishedCommit: commit,
      git: repository,
      workspacePackages,
    },
  ])

  assert.throws(
    () =>
      verifyStableReleaseCommit({
        root: '/repo',
        commit,
        env: environment,
        run: (_command, args) => ({
          stdout: args.includes('branch') ? 'origin/feature\n' : '',
        }),
        workspacePackages,
        git: repository,
        deriveReleasePackages: assert.fail,
      }),
    /is not an ancestor of origin\/main/,
  )
})

test('release finalization targets the exact published commit', () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const calls = []
  const environment = {
    NPM_CONFIG_OTP: 'uppercase-secret',
    npm_config_otp: 'lowercase-secret',
    PATH: '/usr/bin',
  }

  dispatchReleaseFinalization(
    '/repo',
    commit,
    (command, args, options) => {
      calls.push({ command, args, options })
    },
    environment,
  )

  assert.deepEqual(calls, [
    {
      command: 'gh',
      args: [
        'workflow',
        'run',
        'release.yml',
        '-f',
        `published_commit=${commit}`,
      ],
      options: {
        cwd: '/repo',
        inherit: true,
        env: { PATH: '/usr/bin' },
      },
    },
  ])
  assert.throws(
    () => dispatchReleaseFinalization('/repo', 'HEAD', assert.fail),
    /requires a full lowercase Git commit/,
  )
})

test('stable finalization starts only after verified promotion', async () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  const events = []
  const result = await promoteAndFinalizeCurrentWorkspace({
    root: '/repo',
    resolveCommit: () => {
      events.push('resolved commit')

      return commit
    },
    verifyCommit: publishedCommit => {
      events.push(`verified ${publishedCommit}`)
    },
    promote: async () => {
      events.push('verified promotion')

      return { promoted: ['foldkit'], alreadyPromoted: [] }
    },
    dispatch: async publishedCommit => {
      events.push(`dispatched ${publishedCommit}`)
    },
  })

  assert.deepEqual(events, [
    'resolved commit',
    `verified ${commit}`,
    'verified promotion',
    `dispatched ${commit}`,
  ])
  assert.equal(result.publishedCommit, commit)

  events.length = 0

  await assert.rejects(
    promoteAndFinalizeCurrentWorkspace({
      root: '/repo',
      resolveCommit: () => commit,
      verifyCommit: () => {},
      promote: async () => {
        events.push('failed promotion')

        throw new Error('registry verification failed')
      },
      dispatch: async () => {
        events.push('unexpected dispatch')
      },
    }),
    /registry verification failed/,
  )
  assert.deepEqual(events, ['failed promotion'])

  events.length = 0

  await assert.rejects(
    promoteAndFinalizeCurrentWorkspace({
      root: '/repo',
      resolveCommit: () => commit,
      verifyCommit: () => {
        events.push('rejected release commit')

        throw new Error('commit did not version public packages')
      },
      promote: async () => {
        events.push('unexpected promotion')
      },
      dispatch: async () => {
        events.push('unexpected dispatch')
      },
    }),
    /commit did not version public packages/,
  )
  assert.deepEqual(events, ['rejected release commit'])
})

test('stable finalization can retry after a dispatch failure', async () => {
  const commit = '0123456789abcdef0123456789abcdef01234567'
  let promotions = 0
  let dispatches = 0
  const options = {
    root: '/repo',
    resolveCommit: () => commit,
    verifyCommit: () => {},
    promote: async () => {
      promotions += 1

      return { promoted: [], alreadyPromoted: ['foldkit'] }
    },
    dispatch: async () => {
      dispatches += 1

      if (dispatches === 1) {
        throw new Error('GitHub dispatch failed')
      }
    },
  }

  await assert.rejects(
    promoteAndFinalizeCurrentWorkspace(options),
    /GitHub dispatch failed/,
  )
  await promoteAndFinalizeCurrentWorkspace(options)

  assert.equal(promotions, 2)
  assert.equal(dispatches, 2)
})
