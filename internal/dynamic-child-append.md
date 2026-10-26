# Dynamic child append

The [initialization family followup](child-initialization-family.md) adds singular
set and direct-value map insertion after this original array-helper proof. The
measurements and adoption counts below describe that earlier checkpoint.

`initAndAppend` from `foldkit/bindingInit` removes a repeated array writer when
the Binding already declares `init.instances` and `init.toItem`:

```ts
return initAndAppend(ProjectSettingsBinding, model, {
  key: project.id,
  args: [project],
})
```

The parent owns the key and absence decision. The Binding's existing `toItem`
constructs the wrapper, including parent-owned fields. The helper returns an
ordinary passive initialization recipe; the registered Composition initializes
the child and lifts its Commands. It does not create a Runtime phase or change
ordinary folds and operations into insertion operations.

## Scope and adoption

The helper supports one exact keyed array with an existing initial-instance
policy, with or without a child wrapper. Duplicate keys are rejected. Other
items keep their order and identity. The wrapper must preserve the supplied key
and exact initialized child object.

Workspace's three retained-child arrays and Job Application's three Entry
arrays use this helper. Each already had the required initialization policy.
Counters and the keyed-init guide retain their explicit writer because the same
transition also increments the next ID. Option storage, maps, custom accessors,
replacement, parent Commands and mixed parent transitions keep `Binding.init`.
Do not add a startup policy solely to enable this helper.

## Performance boundary

The helper is a leaf export. It uses existing initialization evidence and does
not add a member or generic contract to every Binding. The five existing
compiler fixtures do not import this optional helper; their unchanged counts
establish that default graph construction carries no extra cost. Opt-in
application latency requires its own paired measurement.

The earlier proposal to augment the default Binding initializer exceeded the
unchanged Workspace compiler ceilings and remains excluded. The leaf export
keeps that cost separate from ordinary feature authoring.

## Verification

Source and relocated emitted fixtures cover exact Model, branded keys, optional
and rest arguments, generated keyed Messages, qualified Command requirements,
Services and required Binding registration. Rejected cases include unsupported
storage, missing policies, ambiguous fields or placements, invalid arguments,
wrong graphs and aliased extra configuration.

Runtime coverage verifies deferred initialization, duplicate rejection before
child init, wrapper and child identity, preserved collection order, retained
Commands and defensive argument capture. Duplicate-guard and extra-Command
mutations fail their regression checks. Actual Workspace and Job Application
typechecks and all 222 application tests pass after migration.

Final combined compiler, installed-package, browser and paired editor results
belong in the release handoff after the candidate is frozen.
