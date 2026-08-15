# Selection Submodels

## Overview

Foldkit UI ships five Submodels for selecting one or more values from a set: [Listbox](/ui/listbox), [Combobox](/ui/combobox), [Tabs](/ui/tabs), [Menu](/ui/menu), and [RadioGroup](/ui/radio-group). For example, a Listbox of plans, a Combobox of cities, a Tabs of view modes, a Menu of actions, or a RadioGroup of pricing plans.

Each exposes a `create<Item>()` factory that pairs the view and update behind a single type parameter, so the value type is fixed at the binding site and flows into the OutMessage.

A Listbox over a literal-union `Plan` type:

::Snippet{name="uiListboxBasic" label="typed Listbox"}

## The `create<Item>()` Factory {#create-factory}

A call to `Listbox.create<Plan>()` returns an object whose entry points are all bound to `Plan`: `view` accepts `items: ReadonlyArray<Plan>`, `update` returns an OutMessage carrying the picked `Plan`, and the imperative helpers the Submodel exposes (`selectItem`, `open`, and `close` for Listbox and Combobox) accept and emit `Plan` too. Declare the factory once at module scope and use the same bundle at every site that needs it.

There is no inbound reflect helper for the selection: the parent owns it outright and passes it in as `maybeSelectedValue` (`selectedValues` for multi-select), so there is nothing on the Listbox or Combobox to reflect onto. When an external value (a URL parameter, restored storage, a server push) changes the selection, the parent writes its own field. The `reflect*` family lives on the components with configuration the parent feeds in: `reflectMinDate`, `reflectMaxDate`, `reflectDisabledDates`, and `reflectDisabledDaysOfWeek` on Calendar and DatePicker, and `reflectRange` on Slider. See [Reflecting External State](/core/submodel#reflecting-external-state) for the concept.

## Naming What `create` Returns {#bundle-type}

Each component exports a `Bundle` type for what its factory returns, taking the same type parameters as the factory itself. `Listbox.Bundle<Plan>` is what `Listbox.create<Plan>()` produces, `Menu.Bundle<Action>` is what `Menu.create<Action>()` produces, and the multi-select variants export their own under `Listbox.Multi.Bundle` and `Combobox.Multi.Bundle`.

Declaring the factory at module scope and using it directly needs no annotation, since inference covers it. Reach for `Bundle` when a created bundle has to be named instead. For example: a config object with a field typed `Combobox.Bundle<City>`, or a view helper whose parameter is `Listbox.Bundle<Plan>` because it receives the bundle rather than calling `create` itself.

The name also matters to consumers that emit their own declarations. Without it, TypeScript has to expand the factory's whole result into the generated `.d.ts` at every use site, and it refuses where that expansion reaches a type the consumer cannot name.

## The Submodel Doesn’t Own Your Selection {#submodel-doesnt-own-selection}

A common first question is: if the Listbox is Item-typed, why does my own Model still hold an `Option<Plan>` for the picked value? Isn’t that the same state twice?

It isn’t. The Listbox’s Model is UI state: open vs. closed, which option the keyboard is focused on, the typeahead key buffer. It deliberately does not hold the committed selection, because committed selections are domain truth. The Submodel hands you that truth at the moment the user commits via the OutMessage; your update lifts it into your own Model, where it belongs.

That split is why the Listbox Model can stay generic-free (no `Listbox.Model<Item>`) while `Item` still flows into your code with full type safety. The generic threads through the boundary (`items` in, OutMessage `value` out), and nowhere else. If the selection needs to persist, store it in your Model. If the commit just dispatches a Command (for example a Menu of actions), no Model field is needed.

## Why the Factory Exists {#soundness}

Without the factory, the view and update would each carry their own `Item` type parameter. Nothing would stop a consumer from writing `view: Listbox.view<Plan>()` next to `Listbox.update<Color>(...)`. Two different type arguments at the same call site. The selected item would arrive in the OutMessage typed as one and the update would believe it was the other, and TypeScript would have no way to flag the mismatch.

The factory closes that hole by setting `Item` once. The returned `view` and `update` are bound to the same `Item` because both come from the same factory call.

Internally, each Submodel’s view and update are written against an untyped string value and then cast back to the consumer’s `Item` at the factory boundary. The cast is sound because the value being emitted came from the same `items` array the consumer just supplied. The fence keeps a single `Item` type on both sides of that cast.

## The Factories {#factories}

Each Submodel exposes a `create<...>()` factory. The shape of the type parameter differs by what the Submodel accepts as items.

### Listbox

`Listbox.create<Item, Value>()` takes two type parameters, or `Listbox.create<Item>()` when relying on the default. `Item` is the shape of the items the consumer supplies. `Value` is the shape of the value the OutMessage carries; it defaults to `Item` when `Item extends string`, else `string`. The two-parameter shape supports object-typed items via an `itemToValue` callback that extracts the stringy identifier from each `Item`.

`Listbox.Multi.create<Item, Value>()` (or `Listbox.Multi.create<Item>()`) is the multi-select variant. Same type-parameter shape; the `Selected` OutMessage carries only the activated `value`, and the parent toggles that value in and out of the selection it owns.

### Combobox

`Combobox.create<Item>()` takes one type parameter and constrains `Item extends string`. Combobox items are typed strings (a literal union, a branded string type, or plain `string`).

`Combobox.Multi.create<Item>()` is the multi-select variant. Same type-parameter shape; the `Selected` OutMessage carries only the activated `value`, and the parent toggles that value in and out of the selection it owns.

### Tabs

`Tabs.create<Value>()` takes one type parameter, `Value extends string`. The view accepts `ReadonlyArray<Value>` as its tab list (a literal union `Value` is assignable to `string`), and the OutMessage carries both the picked `value: Value` and its `index: number`. The single parameter is enough because Tabs values are always inline strings; there is no object form.

### Menu

`Menu.create<Item>()` takes one type parameter, `Item extends string`. The view accepts `ReadonlyArray<Item>` as its menu items, and the OutMessage carries both the picked `value: Item` and its `index: number`. The picked value arrives directly in the OutMessage, so consumers no longer need to look it up from their own items array.
