import { Predicate } from 'effect'
import semver from 'semver'

const CLAUSE_SEPARATOR = '||'

const requiredDependencyNames = packageJson => {
  const peerMeta = packageJson.peerDependenciesMeta ?? {}
  const requiredPeers = Object.keys(packageJson.peerDependencies ?? {}).filter(
    name => peerMeta[name]?.optional !== true,
  )

  return [
    ...new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...requiredPeers,
    ]),
  ].sort()
}

const unreachableClauses = range => {
  const clauses = range.split(CLAUSE_SEPARATOR).map(clause => clause.trim())

  return clauses.filter((clause, index) =>
    clauses.some(
      (otherClause, otherIndex) =>
        otherIndex !== index &&
        semver.subset(clause, otherClause) &&
        (otherIndex < index || !semver.subset(otherClause, clause)),
    ),
  )
}

export const engineRangeFailures = (packages, readDependencyManifest) => {
  const failures = []

  for (const pkg of packages) {
    const { name } = pkg.packageJson
    const range = pkg.packageJson.engines?.node

    if (!Predicate.isString(range)) {
      failures.push(`${name} declares no engines.node range.`)
      continue
    }

    if (semver.validRange(range) === null) {
      failures.push(
        `${name} declares engines.node "${range}", which is not a semver range.`,
      )
      continue
    }

    for (const clause of unreachableClauses(range)) {
      failures.push(
        `${name} declares engines.node "${range}". The clause "${clause}" adds nothing, because another clause already accepts every version it names.`,
      )
    }

    for (const dependencyName of requiredDependencyNames(pkg.packageJson)) {
      const dependencyManifest = readDependencyManifest(pkg, dependencyName)

      if (dependencyManifest === undefined) {
        failures.push(
          `${name} requires ${dependencyName}, which is not installed, so its Node range cannot be compared.`,
        )
        continue
      }

      const dependencyRange = dependencyManifest.engines?.node

      if (
        !Predicate.isString(dependencyRange) ||
        semver.validRange(dependencyRange) === null
      ) {
        continue
      }

      if (!semver.subset(range, dependencyRange)) {
        failures.push(
          `${name} declares engines.node "${range}" but requires ${dependencyName}@${dependencyManifest.version}, which needs "${dependencyRange}". The package accepts Node versions that ${dependencyName} rejects.`,
        )
      }
    }
  }

  return failures
}
