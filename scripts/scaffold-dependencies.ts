type DependencyManifest = Readonly<{
  dependencies?: Readonly<Record<string, string>>
  devDependencies?: Readonly<Record<string, string>>
}>

export type PackedScaffoldPackage = Readonly<{
  name: string
  tarballPath: string
  peerDependencies: ReadonlyArray<string>
}>

export const selectScaffoldTarballs = (
  manifest: DependencyManifest,
  packages: ReadonlyArray<PackedScaffoldPackage>,
  localPackageNames: ReadonlyArray<string>,
): ReadonlyArray<string> => {
  const localNames = new Set(localPackageNames)
  const packagesByName = new Map(packages.map(pkg => [pkg.name, pkg]))
  const pendingNames = [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ]
  const selectedNames = new Set<string>()

  for (const name of pendingNames) {
    if (!localNames.has(name) || selectedNames.has(name)) {
      continue
    }

    const pkg = packagesByName.get(name)

    if (pkg === undefined) {
      throw new Error(
        `No tarball was packed for local scaffold dependency ${name}`,
      )
    }

    selectedNames.add(name)
    pendingNames.push(...pkg.peerDependencies)
  }

  return packages
    .filter(pkg => selectedNames.has(pkg.name))
    .map(pkg => pkg.tarballPath)
}
