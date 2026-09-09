const RELEASE_BRANCH = 'changeset-release/main'

export const shouldCheckChangesetStatus = ({
  eventName,
  headRef,
  headRepository,
  repository,
}) =>
  eventName === 'pull_request' &&
  (headRef !== RELEASE_BRANCH || headRepository !== repository)
