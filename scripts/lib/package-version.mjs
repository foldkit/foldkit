import semver from 'semver'

const fail = message => {
  throw new Error(message)
}

export const canaryVersion = (version, commit) => {
  const parsed = semver.parse(version)

  if (parsed === null) {
    return fail(`cannot create a canary from invalid version ${version}`)
  }

  if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
    return fail(`cannot create a canary from invalid commit ${commit}`)
  }

  return `${parsed.major}.${parsed.minor}.${parsed.patch}-canary.${commit.slice(0, 12)}`
}
