# Selection Blocks

## Overview

Foldkit UI ships five Blocks for selecting values from a set: [Listbox](/ui/listbox), [Combobox](/ui/combobox), [Tabs](/ui/tabs), [Menu](/ui/menu), and [RadioGroup](/ui/radio-group). Listbox and Combobox also provide multi-select variants.

For example: a Listbox of plans, a Combobox of cities, Tabs for view modes, a Menu of actions, or a RadioGroup of pricing plans.

### Typed Block Contracts {#typed-completed-blocks}

Each factory declares a passive Block contract with view inputs and a `Selected` OutMessage typed for the values your application uses. Listbox and Menu also type their `requestSelectItem` Binding operations. Listbox and Combobox take Schemas so their public contracts also carry exact Message and OutMessage Schemas. The other selection factories take type parameters.

A Listbox over a literal-union `Plan` type:

::Snippet{name="uiListboxBasic" label="Typed Listbox"}

## Make a typed Block {#make-block-factory}

A call to `Listbox.makeBlock(Plan)` returns a passive Block contract bound to the `Plan` Schema. Its view inputs accept `items: ReadonlyArray<Plan>`, its `requestSelectItem` Binding operation takes a `Plan`, and its typed `Selected` OutMessage carries a `Plan`. Declare the factory once at module scope, bind that value in the parent, and provide `Listbox.layer` to the parent's construction Layer. Building that Layer acquires the child implementation; the parent's init later creates each occurrence's Model and Commands. The public declaration has no callable `init`, `update`, or `view`.

There is no inbound inform operation for the selection: the parent owns it outright and passes it in as `maybeSelectedValue` (`selectedValues` for multi-select), so there is no child Model field to update. When an external value changes the selection, the parent writes its own field. Components that store parent-provided configuration provide child operations instead: Calendar and DatePicker provide `informOfMinDateChanged`, `informOfMaxDateChanged`, `informOfDisabledDatesChanged`, and `informOfDisabledDaysOfWeekChanged`; Slider provides `informOfRangeChange`. See [Informing a child about external state](/core/block#informing-external-state).

## Naming What a Factory Returns {#completed-type}

The root `@foldkit/ui` namespace exposes a `Completed` type under each component namespace for the passive contract its factory returns. The name does not mean an acquired executable: `Listbox.Completed<Plan>` describes `Listbox.makeBlock(Plan)`. The Combobox, multi-select Listbox and Combobox, Tabs, Menu, and RadioGroup namespaces expose their corresponding `Completed` types.

### When to Name the Returned Contract {#when-to-name-the-completed-block}

Declaring the factory at module scope and using it directly needs no annotation, since inference covers it. Reach for a namespaced `Completed` type when a returned contract needs a type name. For example, a config object may hold a `Combobox.Completed<City>` from `@foldkit/ui`, or an authoring helper may accept `Listbox.Completed<Plan>` instead of calling the factory itself.

### Declaration Output

The name also matters to consumers that emit their own declarations. Without it, TypeScript has to expand the factory's whole result into the generated `.d.ts` at every use site, and it refuses where that expansion reaches a type the consumer cannot name.

## The Block Doesn’t Own Your Selection {#block-doesnt-own-selection}

A common first question is: if the Listbox is Item-typed, why does my own Model still hold an `Option<Plan>` for the picked value? Isn’t that the same state twice?

### UI State and Domain State

It isn’t. The Listbox’s Model is UI state: open vs. closed, which option the keyboard is focused on, the typeahead key buffer. It deliberately does not hold the committed selection, because committed selections are domain truth. The Block hands you that truth at the moment the user commits via the OutMessage; your update lifts it into your own Model, where it belongs.

`Listbox.Model` has no `Item` type parameter. The parent supplies the items through the view inputs and receives the typed `Selected` OutMessage. If the selection needs to persist, store it in your Model. If the commit just dispatches a Command (for example a Menu of actions), no Model field is needed.

## Types and runtime validation {#soundness}

### Runtime Schemas

Listbox uses its Value Schema to type and validate selection Messages, OutMessages, and `requestSelectItem` operations. There is no generic-only compatibility form: pass the Schema value itself rather than writing `Listbox.makeBlock<Plan>()`.

The two-Schema form separates view data from the serialized selection boundary. Its Item Schema witnesses the items and callbacks accepted by the view; Foldkit does not add that Schema to serialization or Service requirements. Its Value Schema validates every selected value at runtime. When `Item extends Value`, items are already valid values and `itemToValue` may be omitted. Otherwise, supply `itemToValue` to extract a Value. A broad Item type may omit the extractor only when the actual `items` array contains values that satisfy both Item and Value.

### The Schema Boundary

Listbox and Combobox build their Message and OutMessage Schemas from the supplied Value or Item Schema. Decoding with those Schemas validates selection payloads at runtime. Their view inputs, selection operations and OutMessage constructors retain the corresponding types.

### Type-parameter factories

Menu, Tabs and RadioGroup type their view inputs and OutMessages through type parameters. Their runtime selection Codecs accept strings; a type argument supplies no runtime validator for a narrower domain. Validate external selection payloads with the application's value Schema at the boundary. Menu's `requestSelectItem` operation checks its Item type in TypeScript.

## The Factories {#factories}

Each configurable selection Block has a root factory export. Its inputs differ by what the Block accepts as items.

### Listbox

Listbox has three factory forms:

- `Listbox.makeBlock()` uses `Schema.String` for both Item and Value.
- `Listbox.makeBlock(ValueSchema)` uses the supplied string Schema for both Item and Value.
- `Listbox.makeBlock(ItemSchema, ValueSchema)` accepts richer view items and uses the Value Schema for selected Messages and OutMessages.

:::Snippet{name="uiListboxFactoryForms" label="Listbox factory forms"}

`Listbox.Multi.makeBlock` has the same three forms. Its `Selected` OutMessage carries only the activated Value, and the parent toggles that value in and out of the selection it owns.

### Combobox

`Combobox.makeBlock(Item)` takes one string Schema, such as `Combobox.makeBlock(City)`. Combobox items may be a literal union, a branded string Schema, or plain `Schema.String`.

`Combobox.Multi.makeBlock(Item)` is the multi-select variant. It takes the same Schema shape; the `Selected` OutMessage carries only the activated `value`, and the parent toggles that value in and out of the selection it owns.

### Tabs

`Tabs.makeBlock<Value>()` takes one type parameter, `Value extends string`. The view accepts `ReadonlyArray<Value>` as its tab list (a literal union `Value` is assignable to `string`), and the OutMessage carries both the picked `value: Value` and its `index: number`. The single parameter is enough because Tabs values are always inline strings; there is no object form.

### Menu

`Menu.makeBlock<Item>()` takes one type parameter, `Item extends string`. The view accepts `ReadonlyArray<Item>` as its menu items, and the OutMessage carries both the picked `value: Item` and its `index: number`. The picked value arrives directly in the OutMessage, so consumers no longer need to look it up from their own items array.
