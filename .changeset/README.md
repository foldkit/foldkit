# Changesets

This project uses [changesets](https://github.com/changesets/changesets) to manage versioning and changelogs.

## For Contributors

When you make a change that should be noted in the changelog, run:

```bash
pnpm changeset
```

This will prompt you to:

1. Select which packages are affected
2. Choose the bump type (major/minor/patch)
3. Write a summary of the change

A markdown file will be created in `.changeset/` - commit this with your PR.

## Version Guidelines

- **empty**: Internal changes with no user-facing effect, such as refactors and test-only changes. Create one with `pnpm changeset add --empty`; it satisfies `changeset status` without adding a changelog entry
- **patch**: Bug fixes, documentation updates, metadata changes
- **minor**: New features and public breaking changes while Foldkit is pre-1.0
- **major**: Reserved for the eventual 1.0 release and post-1.0 breaking changes

## For Maintainers

When changesets are merged to main, a "Version Packages" pull request is automatically created. Merging that pull request:

1. Updates package versions
2. Updates CHANGELOG.md files
3. Uploads and verifies the stable package set without moving `latest`
4. Promotes the complete package set to `latest` through npm trusted publishing
5. Verifies the promoted versions, creates matching Git tags and GitHub Releases, and deploys the production website from the release commit

Write changesets for package-specific changes. When shared build inputs change, the release planner automatically adds patch bumps for every website package. Existing larger bumps take precedence.

Every public package's `release.yml` trusted publisher must have **Allow npm dist-tag** enabled alongside **Allow npm publish**. GitHub Actions publishes and promotes routine releases automatically using OIDC. If a release fails, rerun its failed GitHub Actions jobs. See [Releasing](../RELEASING.md) for authentication setup and recovery.
