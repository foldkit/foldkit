# @foldkit/devtools

## 0.112.3

### Patch Changes

- 63c8b51: Author the overlay styles as a committed source module rather than generating
  them from CSS at build time. The compiled output is unchanged.

## 0.112.2

## 0.112.1

## 0.112.0

### Minor Changes

- a481ddb: Split UI components and the in-browser DevTools overlay out of core.

  The 24 UI components move from `foldkit/ui/*` to the new `@foldkit/ui` package, and the DevTools overlay moves to the new `@foldkit/devtools` package. Breaking changes in either no longer force a core version bump.

  Migration:
  - Component usage moves to named imports from the new package: `import { Ui } from 'foldkit'` with `Ui.Button.view(...)` becomes `import { Button } from '@foldkit/ui'` with `Button.view(...)`. The `foldkit/ui/button` subpath becomes `@foldkit/ui/button`. Add `@foldkit/ui` to your dependencies. When a component name collides with another import (for example core's `Calendar`), alias it: `import { Calendar as UiCalendar } from '@foldkit/ui'`.
  - The DevTools overlay is now opt-in. `devTools: true` (or a `devTools` config object) still records history and serves the WebSocket bridge for the DevTools MCP server, but no longer mounts the in-browser panel on its own. To show the panel, install `@foldkit/devtools` and pass its overlay factory:

    ```ts
    import { overlay } from '@foldkit/devtools'

    Runtime.makeApplication({
      // ...
      devTools: { Message, overlay },
    })
    ```

  New public surface on core to support the split: the `foldkit/submodel` subpath, `foldkit/devtools-host` (the instrumentation API the overlay builds on), and `DevToolsOverlay` / `DevToolsPosition` from `foldkit/runtime`.
