// NOTE: Tests that drive git in a temporary repository run it with the
// developer's own configuration kept out. A global `tag.gpgsign` turns the
// plain `git tag` a release test makes into a signed annotated tag and git
// refuses it for want of a message; a global `commit.gpgsign` asks a key to
// sign every fixture commit. Neither has anything to do with what the tests
// check, and the pre-push hook running them failed on any machine with such
// a setting. The identity is supplied here too, since the global one is gone.
export const gitTestEnvironment = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Foldkit Test',
  GIT_AUTHOR_EMAIL: 'foldkit@example.com',
  GIT_COMMITTER_NAME: 'Foldkit Test',
  GIT_COMMITTER_EMAIL: 'foldkit@example.com',
}
