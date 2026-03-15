# Release Package

This project uses [changesets](https://github.com/changesets/changesets) for versioning and releases.

## Step 1: Audit commits since last release

Find the most recent "Version Packages" commit and list every commit since then:

```bash
git log --oneline --all --grep="Version Packages" | head -1
```

Then for each commit, check whether it touches files in any published package (`packages/foldkit/`, `packages/create-foldkit-app/`, `packages/vite-plugin-foldkit/`). Categorize each:

- **Breaking change** — needs a major changeset
- **New feature** — needs a minor changeset
- **Bug fix / internal refactor / metadata update** — needs a patch changeset
- **Website, examples, docs only** — no changeset needed (these are in the changesets ignore list)

Present the full audit table to the user before proceeding.

## Step 2: Review existing changesets

Read all `.changeset/*.md` files (excluding `config.json` and `README.md`). Check whether the existing changesets already cover every releasable change found in Step 1. Identify any gaps.

## Step 3: Create or update changesets

For any unreleased changes not covered by existing changesets, either:

- **Update** an existing changeset if the change belongs to the same package and release
- **Create** a new changeset file in `.changeset/` with the format:

```markdown
---
'package-name': patch|minor|major
---

Description of the change.
```

**Note:** The project formatter converts double quotes to single quotes in changeset YAML frontmatter. Always use single quotes: `'foldkit': minor`.

## Version Guidelines

- **patch** - Bug fixes, documentation updates, internal refactors, metadata changes
- **minor** - New features, non-breaking API additions
- **major** - Breaking changes to public APIs

## Step 4: Present summary

Show the user the final release plan:

- Which packages will be released and at what bump level
- What the new version numbers will be
- A summary of all changes included

Ask the user to confirm before committing.

## Release Process

Releases happen automatically via GitHub Actions:

1. Push changes with changeset files to main
2. GitHub Action creates a "Version Packages" PR
3. Merge that PR to trigger:
   - Version bumps in package.json files
   - CHANGELOG.md updates
   - npm publishing (via trusted publishing/OIDC)
   - GitHub release creation

## Manual Release (if needed)

If automation fails, you can release manually:

```bash
pnpm version-packages  # Apply changesets to versions and changelogs
pnpm release           # Build all packages and publish to npm
```

Note: Manual publishing requires npm login with appropriate permissions.
