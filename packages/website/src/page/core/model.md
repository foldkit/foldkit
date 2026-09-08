# Model

## One State Tree {#overview}

The Model is the complete application state in one immutable data structure. Everything the application can be at a moment lives here, rather than being divided between component-local and global stores.

In the [restaurant analogy](/core/architecture#the-restaurant-analogy), this is the waiter's notebook. The analogy is a memory aid; the literal contract is one state tree that every transition receives and returns.

The counter defines its Model with [Effect Schema](https://effect.website/docs/schema/introduction/):

::Snippet{name="counterModel" label="model example"}

`Schema.Struct` creates the runtime Schema. `typeof Model.Type` derives the TypeScript type from that same definition, so the runtime and compiler agree on the Model’s shape.

That runtime value matters because TypeScript types disappear after compilation. Foldkit uses the Model Schema to encode and decode state preserved across hot updates. The same Schema can validate unknown data at application boundaries.

## State with Variants

Use `defineTaggedUnion` when a Model field can have several named shapes. Declare every variant together, then construct and match values through the union:

::Snippet{name="modelTaggedUnion" label="Model state union example"}

`EditorMode` is the Schema stored in `Model` and the namespace used to construct values such as `EditorMode.Browsing()`. Its `match` method requires every variant to be handled. If you add another editor mode, TypeScript finds each match that needs a new branch.

Use `EditorMode.guards.Editing` to check one variant and `EditorMode.isAnyOf(['Editing', 'Previewing'])` to check several.

When another Schema accepts only some editor modes, build it with `EditorMode.subset(['Editing', 'Previewing'])`. `subset` includes only the tags you name. If you add another mode later, the smaller Schema will not accept it until you add its tag. There is no `omit`: an exclusion list would silently accept every mode added later.

Use `taggedStruct` only when the variants cannot be declared together. Recursive unions and standalone tagged structs are the common cases.

The counter starts with one field. When automatic counting becomes part of the application state, the Model grows to record it:

::Snippet{name="counterModelPreview" label="expanded model example"}

:::Info{label="Model the application, not the screen"}
Store facts the application needs to remember. Values used only to render one frame can usually be derived in view instead of becoming another Model field.
:::

The Model describes the current state. Every change begins with a [Message](/core/messages), a fact about something that happened.
