# Selection Blocks

## Overview

Foldkit UI ships five Blocks for selecting values from a set: [Listbox](/ui/listbox), [Combobox](/ui/combobox), [Tabs](/ui/tabs), [Menu](/ui/menu), and [RadioGroup](/ui/radio-group). Listbox and Combobox also provide multi-select variants.

For example: a Listbox of plans, a Combobox of cities, Tabs for view modes, a Menu of actions, or a RadioGroup of pricing plans.

### Typed Block Contracts {#typed-completed-blocks}

Each exposes a factory that keeps one item type across its view inputs, transitions, Binding operations, and `Selected` OutMessage. Most factories take a type parameter. Combobox takes the Item Schema itself so its public contract also carries exact Message and OutMessage Schemas.

A Listbox over a literal-union `Plan` type:

::Snippet{name="uiListboxBasic" label="Typed Listbox"}

## Make a typed Block {#make-block-factory}

A call to `Listbox.makeBlock<Plan>()` returns a passive Block contract bound to `Plan`. Its view inputs accept `items: ReadonlyArray<Plan>`, and its transitions can emit a `Selected` OutMessage carrying a `Plan`. Declare the factory once at module scope, bind that value in the parent, and provide `Listbox.layer` to the parent's construction Layer. Building that Layer acquires the child implementation; the parent's init later creates each occurrence's Model and Commands. The public declaration has no callable `init`, `update`, or `view`.

There is no inbound inform operation for the selection: the parent owns it outright and passes it in as `maybeSelectedValue` (`selectedValues` for multi-select), so there is no child Model field to update. When an external value changes the selection, the parent writes its own field. Components that store parent-provided configuration provide child operations instead: Calendar and DatePicker provide `informMinDateChanged`, `informMaxDateChanged`, `informDisabledDatesChanged`, and `informDisabledDaysOfWeekChanged`; Slider provides `informRangeChange`. See [Informing a child about external state](/core/block#informing-external-state).

## Naming What a Factory Returns {#completed-type}

Each component subpath exports a `Completed` type for the passive contract its factory returns. The name does not mean an acquired executable: `Completed<Plan>` from `@foldkit/ui/listbox` describes `Listbox.makeBlock<Plan>()`. The Combobox, multi-select Listbox and Combobox, Tabs, Menu, and RadioGroup subpaths expose their corresponding `Completed` types.

### When to Name the Returned Contract {#when-to-name-the-completed-block}

Declaring the factory at module scope and using it directly needs no annotation, since inference covers it. Reach for `Completed` when a returned contract needs a type name. For example, a config object may hold a `Completed<City>` imported from `@foldkit/ui/combobox`, or an authoring helper may accept `Completed<Plan>` from `@foldkit/ui/listbox` instead of calling the factory itself.

### Declaration Output

The name also matters to consumers that emit their own declarations. Without it, TypeScript has to expand the factory's whole result into the generated `.d.ts` at every use site, and it refuses where that expansion reaches a type the consumer cannot name.

## The Block Doesn’t Own Your Selection {#block-doesnt-own-selection}

A common first question is: if the Listbox is Item-typed, why does my own Model still hold an `Option<Plan>` for the picked value? Isn’t that the same state twice?

### UI State and Domain State

It isn’t. The Listbox’s Model is UI state: open vs. closed, which option the keyboard is focused on, the typeahead key buffer. It deliberately does not hold the committed selection, because committed selections are domain truth. The Block hands you that truth at the moment the user commits via the OutMessage; your update lifts it into your own Model, where it belongs.

That split is why the Listbox Model can stay generic-free (no `Listbox.Model<Item>`) while `Item` still flows into your code with full type safety. The generic threads through the boundary (`items` in, OutMessage `value` out), and nowhere else. If the selection needs to persist, store it in your Model. If the commit just dispatches a Command (for example a Menu of actions), no Model field is needed.

## Why the Factory Exists {#soundness}

### One Item Type Across View and Update

Without the factory, separately generic view and update functions could be instantiated with different item types at the same call site. The selected item could arrive in the OutMessage as one type while update treated it as another, and TypeScript would have no shared value through which to enforce the relationship.

The factory closes that hole by setting `Item` once in the public contract. Parent Bindings preserve that relationship across view inputs, transitions, operations and OutMessages when they acquire the implementation from its Layer. The declaration supplies the Schemas and authoring helpers; the acquired executable supplies callable init, update and view functions.

### The Schema Boundary

Combobox builds its Message, OutMessage, view, and update from the supplied Item Schema, so it needs no erased generic cast at the factory boundary. The Schema also lets the parent Block validate the child Message and OutMessage contracts when it creates a Binding.

## The Factories {#factories}

Each generic selection Block has a root factory export. Its inputs differ by what the Block accepts as items.

### Listbox

`Listbox.makeBlock<Item, Value>()` takes two type parameters, or `Listbox.makeBlock<Item>()` when relying on the default. `Item` is the shape of the items the consumer supplies. `Value` is the shape of the value the OutMessage carries; it defaults to `Item` when `Item extends string`, else `string`. The two-parameter shape supports object-typed items via an `itemToValue` callback that extracts the stringy identifier from each `Item`.

`Listbox.Multi.makeBlock<Item, Value>()` (or `Listbox.Multi.makeBlock<Item>()`) is the multi-select variant. Same type-parameter shape; the `Selected` OutMessage carries only the activated `value`, and the parent toggles that value in and out of the selection it owns.

### Combobox

`Combobox.makeBlock(Item)` takes one string Schema, such as `Combobox.makeBlock(City)`. Combobox items may be a literal union, a branded string Schema, or plain `Schema.String`.

`Combobox.Multi.makeBlock(Item)` is the multi-select variant. It takes the same Schema shape; the `Selected` OutMessage carries only the activated `value`, and the parent toggles that value in and out of the selection it owns.

### Tabs

`Tabs.makeBlock<Value>()` takes one type parameter, `Value extends string`. The view accepts `ReadonlyArray<Value>` as its tab list (a literal union `Value` is assignable to `string`), and the OutMessage carries both the picked `value: Value` and its `index: number`. The single parameter is enough because Tabs values are always inline strings; there is no object form.

### Menu

`Menu.makeBlock<Item>()` takes one type parameter, `Item extends string`. The view accepts `ReadonlyArray<Item>` as its menu items, and the OutMessage carries both the picked `value: Item` and its `index: number`. The picked value arrives directly in the OutMessage, so consumers no longer need to look it up from their own items array.
