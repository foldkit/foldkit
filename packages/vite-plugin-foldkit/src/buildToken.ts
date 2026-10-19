import MagicString from 'magic-string'
import { randomUUID } from 'node:crypto'
import type { Plugin, ResolvedConfig, ViteBuilder } from 'vite'

import { isFoldkitSingletonPackageSpecifier } from './foldkitPackages.js'

// The build id names the deployment a page came from. The server stamps it on
// the rendered root, the client carries it, and hydration refuses a page whose
// id is not its own before it adopts any DOM.
//
// The aggregate plugin generates one opaque id when a Vite app build contains
// both the client and ssr environments. The id lives on the ViteBuilder's
// ResolvedConfig object, so concurrent builders cannot overwrite one another
// and a later builder in the same process gets a fresh value. Separately
// invoked builds have no shared session and must receive an explicit value.
//
// Foldkit's own build-token module contains a placeholder call. This transform
// replaces that call in both artifacts, which lets Runtime.hydrate and
// renderToString consume the value without application forwarding. Installed
// Foldkit must therefore participate in the server build; the aggregate plugin
// configures that boundary and the post-build check refuses an artifact that
// still imports Foldkit externally.

const BUILD_ID_ENVIRONMENT_VARIABLE = 'FOLDKIT_BUILD_ID'
const FRAMEWORK_BUILD_ID_PLACEHOLDER = 'foldkitBuildIdPlaceholder()'

type BuildIdentitySession = {
  readonly buildId: string | undefined
  readonly externalizedEnvironments: Set<string>
  readonly verifyFrameworkIdentity: boolean
}

const buildIdentitySessions = new WeakMap<
  ResolvedConfig,
  BuildIdentitySession
>()
const developmentBuildIds = new WeakMap<ResolvedConfig, string>()

/** The build id explicitly supplied through plugin configuration or the
 *  environment, or `undefined` when neither supplied a nonempty value.
 *
 * @internal Exported for tests.
 */
export const resolveBuildId = (configured?: string): string | undefined => {
  if (configured !== undefined && configured !== '') {
    return configured
  }
  const fromEnvironment = process.env[BUILD_ID_ENVIRONMENT_VARIABLE]
  return fromEnvironment !== undefined && fromEnvironment !== ''
    ? fromEnvironment
    : undefined
}

/** The id a standalone plugin compiles for one Vite command.
 *
 * @internal Exported for tests.
 */
export const buildIdForCommand = (
  command: 'build' | 'serve',
  configured?: string,
): string | undefined => {
  const resolved = resolveBuildId(configured)
  if (resolved !== undefined) {
    return resolved
  }
  return command === 'serve' ? 'development' : undefined
}

const hasCoordinatedArtifacts = (builder: ViteBuilder): boolean =>
  builder.environments['client'] !== undefined &&
  builder.environments['ssr'] !== undefined

const beginBuildIdentity = (
  builder: ViteBuilder,
  configuredBuildId: string | undefined,
  verifyFrameworkIdentity: boolean,
): void => {
  const isCoordinated = hasCoordinatedArtifacts(builder)
  const buildId =
    configuredBuildId ?? (isCoordinated ? randomUUID() : undefined)

  const session: BuildIdentitySession = {
    buildId,
    externalizedEnvironments: new Set(),
    verifyFrameworkIdentity,
  }
  buildIdentitySessions.set(builder.config, session)
  for (const environment of Object.values(builder.environments)) {
    buildIdentitySessions.set(environment.config, session)
    buildIdentitySessions.set(environment.getTopLevelConfig(), session)
  }
}

const buildIdForConfig = (
  config: ResolvedConfig,
  configuredBuildId: string | undefined,
): string | undefined => {
  if (config.command === 'build') {
    return buildIdentitySessions.get(config)?.buildId ?? configuredBuildId
  }

  const existing = developmentBuildIds.get(config)
  if (existing !== undefined) {
    return existing
  }

  const fresh = configuredBuildId ?? randomUUID()
  developmentBuildIds.set(config, fresh)
  return fresh
}

const replaceAll = (
  source: MagicString,
  code: string,
  search: string,
  replacement: string,
): boolean => {
  let didReplace = false
  let fromIndex = 0
  while (fromIndex < code.length) {
    const index = code.indexOf(search, fromIndex)
    if (index === -1) {
      return didReplace
    }
    source.overwrite(index, index + search.length, replacement)
    didReplace = true
    fromIndex = index + search.length
  }
  return didReplace
}

const isFoldkitBuildTokenModule = (id: string): boolean => {
  const fileName = (id.split('?', 1)[0] ?? '').replaceAll('\\', '/')
  return (
    fileName.endsWith('/foldkit/src/buildToken.ts') ||
    fileName.endsWith('/foldkit/dist/buildToken.js')
  )
}

const hasExternalFoldkitSingletonImport = (
  imports: ReadonlyArray<string>,
  dynamicImports: ReadonlyArray<string>,
): boolean =>
  [...imports, ...dynamicImports].some(isFoldkitSingletonPackageSpecifier)

const transformBuildIdentity = (
  code: string,
  id: string,
  config: ResolvedConfig,
  configuredBuildId: string | undefined,
):
  | Readonly<{
      code: string
      map: ReturnType<MagicString['generateMap']>
    }>
  | undefined => {
  if (
    !isFoldkitBuildTokenModule(id) ||
    !code.includes(FRAMEWORK_BUILD_ID_PLACEHOLDER)
  ) {
    return undefined
  }

  const buildId = buildIdForConfig(config, configuredBuildId)
  const replacement =
    buildId === undefined ? 'undefined' : JSON.stringify(buildId)
  const transformed = new MagicString(code)
  const transformedFramework = replaceAll(
    transformed,
    code,
    FRAMEWORK_BUILD_ID_PLACEHOLDER,
    replacement,
  )
  if (!transformedFramework) {
    return undefined
  }

  return {
    code: transformed.toString(),
    map: transformed.generateMap({ hires: 'boundary', source: id }),
  }
}

const verifyBuildIdentity = (builder: ViteBuilder): void => {
  const session = buildIdentitySessions.get(builder.config)
  if (session === undefined || !session.verifyFrameworkIdentity) {
    return
  }

  const externalized = [...session.externalizedEnvironments]
  if (externalized.length === 0) {
    return
  }

  throw new Error(
    '[foldkit] A Foldkit singleton package was externalized from the ' +
      `${externalized.join(' and ')} ` +
      `${externalized.length === 1 ? 'artifact' : 'artifacts'}, so it can ` +
      'load a framework copy whose hydration build identity was not compiled. ' +
      'Remove Foldkit packages from explicit SSR or Rolldown externalization ' +
      'settings and let @foldkit/vite-plugin bundle them.',
  )
}

/** Compiles one build identity into application entries and Foldkit itself.
 *
 * @internal
 */
export const foldkitBuildToken = (
  buildId?: string,
  verifyFrameworkIdentity = true,
): Array<Plugin> => {
  const configuredBuildId = resolveBuildId(buildId)

  return [
    {
      name: 'foldkit:build-token',
      enforce: 'pre',
      sharedDuringBuild: true,
      config: (_config, { command }) => {
        const legacyBuildId =
          configuredBuildId ?? (command === 'serve' ? 'development' : undefined)
        return legacyBuildId === undefined
          ? {}
          : {
              define: {
                'import.meta.env.FOLDKIT_BUILD_ID':
                  JSON.stringify(legacyBuildId),
              },
            }
      },
      buildApp: {
        order: 'pre',
        async handler(builder) {
          beginBuildIdentity(
            builder,
            configuredBuildId,
            verifyFrameworkIdentity,
          )
        },
      },
      transform(code, id) {
        const config = this.environment.getTopLevelConfig()
        return transformBuildIdentity(code, id, config, configuredBuildId)
      },
      generateBundle(_options, bundle) {
        const isExternalized = Object.values(bundle).some(
          output =>
            output.type === 'chunk' &&
            hasExternalFoldkitSingletonImport(
              output.imports,
              output.dynamicImports,
            ),
        )
        if (!isExternalized) {
          return
        }

        buildIdentitySessions
          .get(this.environment.getTopLevelConfig())
          ?.externalizedEnvironments.add(this.environment.name)
      },
    },
    {
      name: 'foldkit:verify-build-token',
      sharedDuringBuild: true,
      buildApp: {
        order: 'post',
        async handler(builder) {
          verifyBuildIdentity(builder)
        },
      },
    },
  ]
}
