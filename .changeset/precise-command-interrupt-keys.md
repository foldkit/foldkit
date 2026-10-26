---
'foldkit': minor
---

Make keyed Command cancellation derive its identity from the fields declared in `keyFields` on both invocation and interruption. A callback such as `toKey: args => JSON.stringify(args)` now receives the same selected fields on both paths. The Command's handler and recorded invocation args still receive the full decoded args.

`Definition.makeCommand` now contextually types `toKey` from the selected fields, matching `Command.define`. Both APIs reject policies whose key tuples cannot guarantee the fields required by their callback. Ordinary inline configurations keep their existing shape.

Previously accepted broad policy annotations may now fail to compile. Preserve the selected fields in an extracted policy's type:

```ts
const Args = Schema.Struct({ id: Schema.String, revision: Schema.Number })

const interrupt: Command.InterruptOption<typeof Args.Type, 'id'> = {
  keyFields: ['id'],
  toKey: ({ id }) => id,
}
```

An annotation of `Command.InterruptOption<typeof Args.Type>` permits a tuple position to contain either field, so it cannot guarantee that `id` or `revision` is present. A policy selecting multiple fields must preserve each required position in its tuple. Optional and rest positions cannot guarantee a required callback field.

A factory can forward a generic keyed policy when its callback handles uncertain fields as optional. A callback requiring a concrete field needs a precise keyed policy or a Command definition created by the caller. For a keyed-only parameter selecting `id`, use `Exclude<Command.InterruptOption<typeof Args.Type, 'id'>, true>`. Narrow a union of name-keyed, keyed, and omitted policies before constructing the Command. Both `Definition.makeCommand` and `Command.define` conservatively reject unions of differently keyed policies even when each member is valid; construct the Command inside the branch that chooses its concrete policy.

A broad policy remains supported when its callback handles uncertain selected fields as optional. Its Interrupt constructor conservatively requires every possible required field, and preserves the supplied args object. A precise literal tuple or singleton policy annotation keeps cancellation args exact. Generic payload Schemas remain supported when the selected key fields are concrete.

The selected record passed to `toKey` has no prototype and includes only own properties present in the invocation or cancellation args. Use `Object` helpers instead of inherited methods on that record.
