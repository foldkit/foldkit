---
'@foldkit/ui': minor
---

Export `Meter`, `Nav` and `Progress` on their own subpaths, `@foldkit/ui/meter`, `@foldkit/ui/nav` and `@foldkit/ui/progress`, like every other component.

The README promises a subpath import for every component, but these three only existed as namespaces on the main entry: the exports map in `package.json` is edited by hand, and the changes that added Nav (0.124.0) and Meter and Progress (0.164.0) never touched it. A consumer that imports components by subpath, or wraps one in a module that re-exports it with `export *`, had nothing to point at for them. The example aliases gain the same three entries plus the `hoverIntent` alias they were also missing, and a new repository check keeps the component directories, the exports map, the main-entry namespaces and the aliases in step so the next component cannot ship without its subpath.
