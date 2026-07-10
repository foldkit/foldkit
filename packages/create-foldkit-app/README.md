# create-foldkit-app

Scaffolding CLI for new Foldkit applications. Creates a ready-to-run project with Vite, Tailwind CSS, TypeScript, [`@foldkit/vite-plugin`](https://www.npmjs.com/package/@foldkit/vite-plugin) for hot reloading with Model preservation, and your choice of starter example.

## Usage

```bash
npx create-foldkit-app
# or
pnpm create foldkit-app
# or
yarn create foldkit-app
# or
bun create foldkit-app
```

The CLI prompts you for a project name, starter example, and package manager. Pass `--name`, `--example`, and/or `--package-manager` to skip the matching prompts.

## Examples

| Example                  | Description                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------ |
| `counter`                | Simple increment/decrement with reset                                                                  |
| `counters`               | A dynamic list of Counter Submodels with per-instance routing via a wrapper Message                    |
| `todo`                   | CRUD operations with localStorage persistence                                                          |
| `stopwatch`              | Timer with start/stop/reset                                                                            |
| `crash-view`             | Custom crash fallback UI with crash.view and crash.report                                              |
| `slow-warnings`          | Interactive lab for slow update, view, patch, and Subscription dependency warnings                     |
| `form`                   | Form validation with async email checking                                                              |
| `job-application`        | Multi-step form with async validation, file uploads, and per-step error indicators                     |
| `weather`                | HTTP requests with async state handling                                                                |
| `api-cache`              | Query caching in the Model with stale-while-revalidate, request deduplication, and interval refetching |
| `charting`               | Live GitHub and npm telemetry rendered through an ECharts Mount adapter                                |
| `routing`                | URL routing with parser combinators and route parameters                                               |
| `query-sync`             | URL-driven filtering, sorting, and search with query parameters                                        |
| `snake`                  | Classic game built with Subscriptions                                                                  |
| `canvas-art`             | Declarative 2D canvas with shapes, animation-frame Subscriptions, and pointer events                   |
| `generative-art`         | Perlin-noise flow field with evolving particle trails, mouse vortex, and high-frequency Messages       |
| `auth`                   | Authentication with Submodels, OutMessage, and protected routes                                        |
| `shopping-cart`          | Complex state management with nested Models and routing                                                |
| `checkout-machine`       | Experimental state machine checkout with guarded branches and edge Commands                            |
| `pixel-art`              | Pixel editor with undo/redo, UI components, and localStorage persistence                               |
| `websocket-chat`         | Managed resources with WebSocket integration                                                           |
| `managed-resource-layer` | Layer-backed ManagedResource lifecycle with an Effect service                                          |
| `kanban`                 | Drag-and-drop board with fractional indexing, keyboard navigation, and screen reader announcements     |
| `map`                    | Interactive MapLibre GL map with Mount and Subscriptions                                               |
| `web-components`         | QR code designer wiring third-party web components into Foldkit with CustomElement.define              |
| `embedding`              | A Foldkit widget embedded in a plain TypeScript host page with Ports and dispose                       |
| `ui-showcase`            | Every Foldkit UI component with routing and Submodels                                                  |

## License

MIT
