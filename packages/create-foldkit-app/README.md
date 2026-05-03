# create-foldkit-app

Scaffolding CLI for new Foldkit applications. Creates a ready-to-run project with Vite, Tailwind CSS, TypeScript, [`@foldkit/vite-plugin`](https://www.npmjs.com/package/@foldkit/vite-plugin) for hot reloading with Model preservation, and your choice of starter example.

## Usage

```bash
npx create-foldkit-app
# or
pnpm create foldkit-app
# or
yarn create foldkit-app
```

The CLI prompts you for a project name, starter example, and package manager. Pass `--name`, `--example`, and/or `--package-manager` to skip the matching prompts.

## Examples

| Example          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `counter`        | Simple increment/decrement with reset                           |
| `stopwatch`      | Timer with start/stop/reset                                     |
| `weather`        | HTTP requests with async state handling                         |
| `todo`           | CRUD operations with localStorage persistence                   |
| `form`           | Form validation with async email checking                       |
| `snake`          | Classic game built with Subscriptions                           |
| `routing`        | URL routing with parser combinators and route parameters        |
| `query-sync`     | URL-driven filtering, sorting, and search                       |
| `shopping-cart`  | Complex state management with nested Models                     |
| `websocket-chat` | Managed resources with WebSocket                                |
| `auth`           | Authentication with Submodels, OutMessage, and protected routes |
| `ui-showcase`    | Every Foldkit UI component with routing                         |

## License

MIT
