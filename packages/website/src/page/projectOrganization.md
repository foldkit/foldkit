# Project Organization

## Overview

One file, one Block. A Block's file holds everything that defines it: its Message and OutMessage unions, Model Schema, Command and Mount definitions, the class, and its `Live` Layer with the update handlers, Command handlers, and view. To find a feature, open the file named for it.

A Block owns its state and its effects. Its parent decides which instances exist and how to react to their OutMessages. The browser entry owns host configuration, Service provision, and Runtime startup.

:::tip A complete workspace
The [Workspace example](/example-apps/workspace) applies these conventions to shared issue data, routed editors, a project board, comments, and a command palette. Its source keeps each Block in one file, such as `issueBoard.ts` and `commandPalette.ts`, groups the issue detail page with the comment composer only it uses in `issueDetail/`, and keeps shared issue Schemas in `domain/`.
:::

Every source file is one of these kinds:

| File                            | Holds                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| `application.ts`                | The root Block, `Application` and `ApplicationLive`                   |
| A Block file, such as `cart.ts` | One whole Block, named for it in camelCase                            |
| `entry.ts`, `entry.server.ts`   | `Program.make` and `Runtime.run`, or the server render                |
| `services.ts`                   | `ApplicationLayer` and `ApplicationTestLayer`                         |
| `route.ts`                      | `ApplicationRoute` and its routers, when several Blocks share them    |
| `domain/*.ts`                   | Schemas and pure functions used by more than one Block                |
| Tests and fixtures              | `*.story.test.ts`, `*.scene.test.ts`, and fixtures beside their Block |

## Starting Simple

The smallest application is two files. `application.ts` holds the Model, Message union, Commands, `Application` class, and `ApplicationLive` Layer. `entry.ts` chooses the container, creates the Program, and starts the Runtime. Tests import `ApplicationLive` without starting a browser Runtime. The [Counter example](/example-apps/counter) shows this layout.

A child Block follows the same shape in a file named for it. Export the class and its `Live` Layer:

::Snippet{name="organizationCompactBlock" label="Counter Block file"}

Add `counter.story.test.ts` and `counter.scene.test.ts` beside the Block they test.

## File Layout

An application grows by adding Blocks, not by splitting them. The following structure shows where each kind of file goes; do not create empty files to match it.

::Snippet{name="fileLayout" label="Application file structure"}

Name a Block's file after the Block in camelCase: the `IssueBoard` Block lives in `issueBoard.ts`. Group a page with the child Blocks only it uses in a folder named for the page, as `page/settings/` holds `settings.ts` and `themePicker.ts`. A child Block used by several pages stays outside any page folder.

Never split one Block across `message.ts`, `model.ts`, `update.ts`, `command.ts`, or `view.ts`. Those pieces change together, and reading one Message's handler means reading its Command and the view that dispatches it.

### Inside a Block File

Order a Block's file so each declaration comes before its first use:

1. The Message and OutMessage unions.
2. The Model Schema.
3. Command and Mount definitions, which name their result Messages.
4. The class, which lists the Model, Messages, Commands, and Mounts.
5. View helpers and the view.
6. The `Live` Layer, whose constructor yields Services and returns the starting Model, update handlers, Command and Mount handlers, and view.

::Snippet{name="organizationBlockFile" label="Search Block in one file"}

The constructor in `SearchLive` yields the Services its handlers need, here `HttpClient`, and the Command handler closes over them. Update and view stay pure functions of the Model, so they never touch a Service.

Use the standard structural names inside a Block file: `Model`, `Message`, `OutMessage`, and `view`. The class supplies context in parent code, such as `Search.Message.RequestedClear()`. Domain Schemas and individual Commands keep descriptive names such as `Person`, `FetchPeople`, and `FocusSearchInput`.

Declare each Schema's decoded type immediately below it, using the same name and no blank line. Use the short name in explicit annotations, such as `Model`, `Message`, or a domain type. Use `typeof Model` when an API needs the Schema type itself.

::Snippet{name="schemaTypeAlias" label="Schema and decoded type"}

Name a type alias for a view helper's builder after its owner, such as `SearchViewBuilder`.

### Commands, Mounts, and Steps

Commands belong to the Block whose update returns them. Never collect every Command in one application-wide file. Declare the Message union first so each Command and Mount definition can name its result Messages, list the definitions under `Command` and `Mount` in the class, and implement each one under `commands` and `mounts` in the constructor.

A Step transforms one Block's Model, so it lives in that Block's file. Keep a Step used by one handler beside that handler, and a Step shared by several handlers above the `Live` Layer. Named Steps keep the `Step` suffix. When a pure function serves more than one Block, move it to `domain/`.

### Extracting a Child Block

When a Block grows too large to read in one file, extract a feature that owns its own state, effects, or lifecycle into a child Block in its own file. Do not slice the parent's responsibilities into sibling files. Markup that only renders the parent's state and sends the parent's Messages stays in the parent's file as view functions.

A parent holds a child instance in its Model. Name the child class in the parent's Model Schema, create the instance in the parent constructor with `yield* new Child('id', args)`, and put it in the starting Model. Name the instance for its role in the parent, and use that name for the Model field and the id:

::Snippet{name="organizationChildBlock" label="Dashboard holding a Counter"}

The Dashboard reads the child through its public members. It renders `model.counter.view()`, sends `Counter.Message.RequestedReset()` with `model.counter.send(...)`, and handles `ReachedMax` in `...counter.on({ ... })`. It never writes the Counter's Model.

The parent's Layer provides `CounterLive`, because a Block's Layer must be provided to every parent Layer that creates it. Providing it inside `DashboardLive` lets whoever provides `DashboardLive` stay unaware of Counter. For several children, merge their Layers with `Layer.mergeAll` and provide the result once.

### Import Direction

Dependencies point from leaves toward the root:

- `domain/` modules import no Block.
- `route.ts` imports domain modules and no Block.
- A child Block imports domain modules, `route.ts`, and its own children. It never imports its parent.
- `application.ts` imports its children, `route.ts`, and domain modules.
- `entry.ts` imports `application.ts` and `services.ts`.

Keep shared domain Schemas in leaf modules that import no Block, so two Blocks can share them without a cycle.

## Root Application

The root is an ordinary Block named `Application` in `application.ts`. Its constructor creates the root's children, and its Layer provides their merged Layers:

::Snippet{name="applicationRegistrations" label="Root child graph"}

`entry.ts` imports the class and its Layer, provides the root Services, builds the Program, and starts the Runtime:

::Snippet{name="applicationEntryPoint" label="Browser application entry point"}

Keep container lookup, routing Messages, Flags, and DevTools configuration visible in `entry.ts`. A root whose constructor receives `{ url }` takes `routing` here; one that receives `{ flags }` takes a `Flags` Schema. See [Routing and Navigation](/core/routing-and-navigation) for the routed root.

The root's Subscriptions, Flags Schema, and Commands live in `application.ts` with the rest of the root Block. Move `ApplicationRoute` to `route.ts` once a page Block needs it too.

### Ordinary Service Providers {#composing-handler-layers}

A Block constructor yields ordinary Effect Services such as an HTTP client, storage, or an RPC client, and its Command handlers close over them. Root `services.ts` chooses the concrete providers and exports `ApplicationLayer`, with a test alternative `ApplicationTestLayer`:

::Snippet{name="applicationRootLayer" label="Root service Layer composition"}

Block Layers and Service Layers stay separate. Adding a child Block changes the Layers its parent provides. Changing a provider changes `ApplicationLayer`. Neither requires a change elsewhere in `entry.ts`.

Effect represents each required Service in an Effect's requirements type and uses Layers as constructors for Services and their dependencies. Read [Managing Services](https://effect.website/docs/v4/requirements-management/services) before [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) if those Effect concepts are new.

## Where Tests Live

### Test Beside the Owning Block

Put tests beside the Block they exercise and name them for it: `search.story.test.ts` drives the Search Block's update and `search.scene.test.ts` drives its view. Both take the Block's `Live` Layer, with the Services its constructor yields provided by a test Layer. The root's tests are `story.test.ts` and `scene.test.ts` beside `application.ts`.

Test rendering, interactions, Commands, and OutMessages in the Block that owns them. Test at the parent when the behavior is the parent's: what it sends a child, or how it reacts to a child's OutMessage.

### Test Cross-Feature Flows at the Root

Keep root Scene tests for flows that cross Blocks or pages. Split several root flows by subject, such as `checkout.scene.test.ts` and `cart.scene.test.ts`.

Pure modules in `domain/` need neither Story nor Scene; they take ordinary Vitest tests beside them. See the [Testing](/testing) page for the full Story and Scene reference.

## Domain Modules

Put business concepts shared by several Blocks in `domain/`. Each module owns its Schema and pure operations:

::Snippet{name="domainModule" label="Domain module"}

## Imports {#index-reexports}

Import a Block from its file and a domain module as a namespace. A parent imports the class to name it in its Model Schema and to create instances, and imports the `Live` Layer to provide it:

::Snippet{name="organizationImports" label="Block class and domain namespace in a parent Model"}

Do not add an `index.ts` barrel for a Block. The Block's file already exports its class and `Live` Layer, and tests import the definitions they resolve, such as a Command, from the same file.
