/** Data-first / data-last signature for a `reflect*` setter built with
 *  `Function.dual`.
 *
 *  A `reflect*` helper conforms a Submodel to a value that originated
 *  outside it (a URL, a server push, restored storage, a sibling field),
 *  without emitting an OutMessage. It is the inbound complement to
 *  OutMessage's outbound direction: the world is the source of truth, so
 *  the Submodel mirrors it silently and never announces the change back.
 *
 *  Being dual, it reads two ways. Data-first sets the field and returns the
 *  model; data-last returns `(model) => model`, which slots point-free into
 *  an `evo` callback:
 *
 *  ```ts
 *  // data-first
 *  const next = ColorListbox.reflectSelectedItem(model.colors, fromUrl)
 *  // data-last, point-free in evo
 *  evo(model, { colors: ColorListbox.reflectSelectedItem(fromUrl) })
 *  ```
 */
export type Reflect<Model, Value> = {
  (model: Model, value: Value): Model
  (value: Value): (model: Model) => Model
}

/** Two-argument variant of {@link Reflect}, for setters that resolve a
 *  value against a companion argument (e.g. `Tabs.reflectSelectedTab(value,
 *  options)`, which finds the value's index in `options`). */
export type Reflect2<Model, A, B> = {
  (model: Model, a: A, b: B): Model
  (a: A, b: B): (model: Model) => Model
}
