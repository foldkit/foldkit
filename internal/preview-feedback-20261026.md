# October 26 preview feedback assessment

## Scope

The [foldkit-plus report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6415641973)
was posted on October 26 at 12:09:35 UTC and reviews published preview
`1f6776fa7ececa766188df5201eefec6ba781b5d`. It arrived after the earlier feedback
snapshot. The reproduced pre-fix implementation is
`fa96bf7d907fe86cf02c0c6c12cd33e1b7a9923c`.
No newer reply was found on performance-help issue #1737 in this scoped check.

The report combines integration API proposals with two concrete behavior claims.
The user subsequently approved duplicate-Mount rejection and a grouped guide to
existing customization options. Those two improvements are implemented below;
the broader integration proposals remain open design requests. Existing narrower
patterns are described without claiming they supply the requested generic APIs.

## Concrete behavior

### Generated child envelopes are runtime-local

A generated envelope from one occurrence tree decodes in a separate same-shaped
tree and passes live admission when placement, key and generation coincide.
Changing the generation rejects admission; retiring the admitted target makes
its captured guard reject later delivery. The same results occur in both the
published preview and candidate.

Generations protect against stale work within one runtime. They do not
authenticate the source runtime. Default Program inspection does not enable
external dispatch; explicitly enabled DevTools dispatch is a trusted development
interface. Replication and portable intent need an application-owned protocol
mapped to parent Messages and registered Binding operations. The Block and
DevTools guides now state this boundary explicitly. No default externally
reachable vulnerability was established by this construction-level proof.

### One Mount per element

Before the approved fix, two `OnMount` attributes retain only the second action's
marker, registration and hooks. That reproduction matches both old versions. The
[Mount guide](../packages/website/src/page/core/mount.md#one-mount-per-element)
explicitly requires one Mount per element and describes combining work in one
scoped Mount. Composition registration establishes allowed definitions; it
cannot establish the number of attributes on a particular rendered element.

The approved followup rejects a second `OnMount` during VNode construction and
names both Mounts, before either handler starts. The guard covers direct and
spread attributes, including published child attribute groups. Existing
`OnMount`/`OnUnmount` composition keeps its lifecycle behavior. Three regressions
first fail against the old implementation, then pass with the guard. Multiple
independent Mounts on one element still require a separate lifecycle design.

### Discoverable Block customization

The [new customization guide](../packages/website/src/page/core/block.md#customizing-a-block)
groups factories, alternate embedded views authored with completed
`Block.makeView`, parent view inputs, headless child attributes, handler selection
and wrapper Blocks. Its alternate-view snippet is typechecked. No new Block
transformation API is added.

### Reproduction scope

The bounded reproduction uses real built Html/envelope/admission implementations
and distinct synthetic occurrence trees. It does not start a full Runtime,
render DOM, exercise network ingress or establish sender authentication.
Published and pre-fix `html/index.js` and `runtime/childOrigin.js` hashes match.

Local evidence is `/private/tmp/foldkit-preview-new-feedback-20261026/`:

- `reproduce.mjs`: SHA-256
  `9bfc5f7f79209642f10646545692d3bb7357ca2dd774a4eb885a60c488b19739`.
- `results.json`: SHA-256
  `17bddfb01aabd6c57712c764f1cde2691202e1340915db20080a5f24bb8405c3`.
- `provenance.json` records exact implementation pins and built-file hashes.

## Open API proposals

| Report item                              | Current contract and assessment                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Operations exposed as parent Messages | External inputs enter as decoded parent facts through Ports or another application-owned boundary; parent update invokes registered Binding operations. There is no generic `exposeOperations` API. A constructible portable operation protocol is a new convenience/design request. |
| 2. Portable child envelopes              | The runtime-local limitation is clarified above. A separate portable envelope and its admission semantics would be a new protocol; synthetic test envelopes do not provide live authority.                                                                                           |
| 3. Observe every root transition         | Authored root handlers do not observe routed child delivery. Explicit OutMessages and Commands can persist chosen domain facts, but are not a generic `afterUpdate` hook. A whole-transition observer remains a new extension request.                                               |
| 4. Parent-dependent child Subscriptions  | An `inform*` operation can update child-owned request/watch state, and `subscriptions.when` gates activity. There is no generic parent `toContext` projection for child Subscription dependencies; that proposal needs an ownership and restart contract.                            |
| 5. Lazy Blocks                           | A handler may use `import()`, but that is not equivalent to deferred child graphs, queued occurrence Messages, deferred operations or late handler Layer construction. First-class lazy Blocks require a new scheduling and lifecycle design.                                        |
| 6. Observe arbitrary child Messages      | Child-owned facts are reported through OutMessages and folded by the parent. There is no arbitrary Binding Message observer; dirty/autosave reporting and a generic observer are different contracts.                                                                                |
| 7a. Leaf shorthand                       | The checked producer/export boundary applies to leaves too. A shorthand must preserve declaration validation and the measured inference boundary; none is added by this release.                                                                                                     |
| 7b. Vary a completed Block               | The approved guide groups existing factories, headless render inputs, completed-Block alternate views, handler replacement and wrapper Blocks. Arbitrary `rename` or `mapUpdate` combinators are not provided.                                                                       |
| 7c. Several Mounts on one element        | The approved defensive guard rejects duplicate Mounts during VNode construction. First-class multiple-Mount lifecycle composition is not added.                                                                                                                                      |
| 7d. Vocabulary collisions                | This is ecosystem naming feedback; it identifies no source or runtime defect.                                                                                                                                                                                                        |

Duplicate-Mount rejection and customization guidance are the two approved
additions. Do not mark the broader proposals implemented or describe this
assessment as resolving all requested integrations. They remain visible for
future scope decisions.
