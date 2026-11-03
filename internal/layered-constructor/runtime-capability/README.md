# Runtime capability proof

This fixture checks the boundary between an independently declared Block contract and its selected native Runtime graph. Private ManagedResource references stay in the native graph. A public Command requires an owner-specific capability whose value identifies the live implementation and occurrence.

Each Block declaration exports its module's unique symbol key. Capability assertions derive the actual contract's owner, so readable Block ids do not supply the nominal identity.

The facade's handler Layer builds using its ordinary declared Services. Handler construction does not acquire an occurrence capability or private resource references. Each returned Command authenticates the current capability, supplies the occurrence's references and cursor, restores invocation phase, and runs under that occurrence's Scope.

## Run

The fixture imports the canonical `foldkit/block` and `foldkit/story` APIs. Build the core package first, then run from the repository root:

```sh
node internal/layered-constructor/runtime-capability/verify.mjs
```

The verifier also accepts another built checkout as its first argument. It does not build packages or change their source or distribution. It copies the built package and these fixtures into an operating-system temporary directory, runs every check there, and restores each deliberately mutated copy in a `finally` block.

`results.json` records the checked package hashes, temporary log location, and each result. No package source, dependency tree, or distribution snapshot is stored here.

## Source and emitted consumers

The app is a split-file ChatRoom with a nested MessageComposer. Its parent contains two direct Room fields and a Record-keyed Room collection. These modules exercise normal Definition, Composition, Binding, OutMessage policy, init, update, view, Subscription, and ManagedResource authoring.

The source checks assert:

- Socket remains an ordinary required Service; private resource references are replaced only by the owner-specific Runtime capability.
- Graph-constructor Services remain distinct from handler-constructor and Program Services. The `constructionServices.ts` fixture requires StartupConfiguration for graph acquisition and AuditLog for handler construction.
- Facade handler construction needs no occurrence capability. Returned Command execution still requires the exact owner's capability.
- Missing and wrong-owner capabilities are rejected by TypeScript.
- Placement resource reads in a canonical handler constructor are rejected.
- Typed handler-construction failures remain exact.
- An unregistered resource, or one supplied by only some implementation alternatives, is not advertised as installed.
- An explicitly external resource remains an ordinary requirement.
- Pure Story setup requires neither Socket nor handler Service mocks.

The verifier emits the complete fixture's declarations, physically relocates the built package and emitted app into a second consumer's `node_modules`, and checks the public imports with `skipLibCheck: false`. It uses package exports without paths aliases or private declaration remapping.

## Runtime checks

Six runtime cases cover:

1. Capturing a graph-constructor Service while keeping the later handler Layer's Service requirement separate.
2. Pure Story construction and child delivery without handler mocks.
3. Handler Layer construction before Runtime, with no private references; detached Command execution rejects its missing capability.
4. A public ManagedResource read from an arbitrary selected Layer rejects during construction, before attempting to read a reference.
5. A typed handler-construction failure remains observable.
6. Two direct fields and a keyed Room use distinct sockets and stream lifetimes while sharing one memoized handler Layer. That Layer is first constructed outside any occurrence Context. A caller containing only the authentic capability and execution service can send through the correct socket. Wrong occurrence and implementation, keyed retirement, closed graph acquisition, and duplicate native implementation enrollment reject. All sockets and listeners are cleaned up.

The runtime test uses native lowering, resource providers, composition Runtime, routing, qualification, and node scopes. Its host setup uses internal protocol entry points so it can inspect and deliberately omit references. This fixture does not claim public Program, browser, or SSR verification; those are separate integration checks.

## Failing controls

The verifier must observe four failures in temporary copies:

| Control                                              | Expected failure                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Erase the capability's owner phantom                 | The wrong-owner TypeScript rejection becomes an unused expectation          |
| Remove Runtime capability installation               | Real resource execution fails to find its capability                        |
| Disable the selected Layer's construction guard      | The resource-read regression loses its construction-phase rejection         |
| Restore construction phase during Command invocation | A capability-only resource invocation falsely rejects as constructor access |

The invocation-phase control protects a concrete defect found by this proof. Native handlers capture their construction Context. Without an explicit invocation-phase override, a minimal capability-only caller inherited the constructor's phase flag and could not read its resource.

## Scope

The fixture covers the capability bridge and its requirement channels. It does not change generic identity policy, add a public occurrence-acquisition API, establish compiler performance, or replace the full release verification. The selected native implementation still passes ordinary completion and registration validation before the opaque boundary is created.

## Canonical import refresh

The proof was rerun against the current built package after the experimental authoring and testing subpaths were removed. Source, declaration emission, six runtime tests, strict relocated consumption, and all four controlled failures passed. Only fixture imports changed; no framework implementation or distribution files were modified for this rerun.
