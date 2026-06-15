---
'create-foldkit-app': patch
---

Pin `@foldkit/ui` and `@foldkit/devtools` to `latest` when scaffolding an
example. These ship from the same monorepo as `foldkit`, so an example that
depends on them now installs published versions instead of leaking a
`workspace:` specifier into the generated project.
