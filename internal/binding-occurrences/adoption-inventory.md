# Child Instance adoption inventory

## Result

Counters is the only existing application that stores an array of child wrappers containing just an occurrence key and a child Model. Its migration uses `CounterBlock.Instance` and `CountersBinding.create` for both startup and later additions. The lead owns those changes.

No other production consumer needs a storage change for this API. The audit retained direct children, keyed domain Models, optional children, map storage, and wrappers with application metadata. Adding wrappers to those consumers would increase their bookkeeping.

This inventory covers every example application, the Website, Typing Game, scaffold applications, and library consumers. It is an adoption audit of the standard string-keyed Instance-array API, not a proposal to replace every existing initialization API.

## Example applications

| Application              | Current child storage                                                                                           | Adoption                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `api-cache`              | One direct Tabs Model; posts and stats are application data                                                     | Keep direct storage                                                                                              |
| `api-cache-query`        | Direct Query, KeyedQuery, and Tabs Models                                                                       | Keep direct storage; keyed query entries are cache data                                                          |
| `auth`                   | Whole tagged-variant children at the root; direct login/register children                                       | Keep variant and direct Bindings                                                                                 |
| `canvas-art`             | No child Bindings; balls are domain data                                                                        | No Instance-array transition                                                                                     |
| `charting`               | Direct RadioGroup Models                                                                                        | Keep direct storage                                                                                              |
| `counter`                | Leaf Block                                                                                                      | No child storage                                                                                                 |
| `counters`               | Repeated wrappers containing only identity and Counter Model                                                    | Migrated by the lead to `Schema.Array(CounterBlock.Instance)` and `Binding.create`                               |
| `crash-view`             | Graphless application                                                                                           | No child storage                                                                                                 |
| `embedding`              | Graphless independently hosted widget                                                                           | No child storage                                                                                                 |
| `form`                   | Graphless form                                                                                                  | No child storage                                                                                                 |
| `generative-art`         | Direct Slider Models; particles and trails are domain data                                                      | Keep direct storage                                                                                              |
| `interrupting-commands`  | Upload records are application data                                                                             | No child storage                                                                                                 |
| `job-application`        | Direct feature Models; Skills, Education, and WorkHistory store arrays of entry Models keyed by their own `id`  | Keep direct entry storage and existing `initAndAppend`                                                           |
| `kanban`                 | Direct DragAndDrop Model; columns and cards are domain data                                                     | Keep direct storage                                                                                              |
| `managed-resource-layer` | Graphless resource-owning application                                                                           | No child storage                                                                                                 |
| `map`                    | Locations are domain data                                                                                       | No child storage                                                                                                 |
| `personal-blog`          | One direct Counter Model                                                                                        | Keep direct storage                                                                                              |
| `pixel-art`              | Direct Dialog, RadioGroup, and Listbox Models; grids and history are data                                       | Keep direct storage                                                                                              |
| `query-sync`             | Direct Listbox Models                                                                                           | Keep direct storage                                                                                              |
| `route-transitions`      | Routes and transition log are application data                                                                  | No child storage                                                                                                 |
| `routing`                | One direct People page Model                                                                                    | Keep direct storage                                                                                              |
| `shopping-cart`          | One direct Products page Model; product/cart arrays are domain data                                             | Keep direct storage                                                                                              |
| `slow-warnings`          | Warning records are application data                                                                            | No child storage                                                                                                 |
| `snake`                  | Graphless game                                                                                                  | No child storage                                                                                                 |
| `ssg`                    | Graphless rendering application                                                                                 | No child storage                                                                                                 |
| `ssr`                    | Graphless rendering application                                                                                 | No child storage                                                                                                 |
| `state-machine`          | One direct RadioGroup Model; Machine state and transition log are data                                          | Keep direct storage                                                                                              |
| `stopwatch`              | Graphless application                                                                                           | No child storage                                                                                                 |
| `todo`                   | Todos are domain data                                                                                           | No child storage                                                                                                 |
| `ui-showcase`            | Direct UI feature Model and direct component Models                                                             | Keep direct storage                                                                                              |
| `view-transitions`       | Graphless application                                                                                           | No child storage                                                                                                 |
| `weather`                | Application-owned asynchronous data                                                                             | No child storage                                                                                                 |
| `web-components`         | CustomElement integration without child Bindings                                                                | No Instance-array transition                                                                                     |
| `websocket-chat`         | Chat messages are domain data                                                                                   | No child storage                                                                                                 |
| `workspace`              | Direct feature/control Models; `issueBoards`, `issueDetails`, and `projectSettings` are Records of child Models | Keep direct children and `makeMapBinding`; `makeInitIfMissingStep` preserves retained editors by entity identity |

### Job Application entry arrays

The entry Schemas own their `id` alongside domain fields and controls. Each existing Binding reads that `id` directly and its startup `toItem` returns the initialized entry unchanged. The parent uses the same identity when validating entries, rendering rows, and handling removal. Wrapping entries in `{ key, model }` would duplicate that identity and change those selectors without removing an application requirement.

The existing `initAndAppend` calls therefore remain intentional uses of the direct keyed-array initialization path. They are not incomplete Instance migrations.

## Website and Typing Game

| Consumer                             | Current child storage                                                                             | Adoption                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Website root                         | Direct feature/control Models plus optional Home and Playground Models                            | Keep direct and optional Bindings                            |
| Website Home                         | Direct Tabs, Menu, AsyncCounterDemo, and NotePlayerDemo Models                                    | Keep direct storage                                          |
| Website NotePlayerDemo               | One direct RadioGroup Model; note sequences are domain data                                       | Keep direct storage                                          |
| Website Search                       | One direct Dialog Model; results are domain data                                                  | Keep direct storage                                          |
| Website ExampleDetail and Playground | Direct Tabs Models; source files and dirty paths are domain data                                  | Keep direct storage                                          |
| Website UI pages                     | Direct component Models, including VirtualList; chat messages and draggable cards are domain data | Keep direct storage                                          |
| Other Website Blocks                 | Leaf Blocks with no repeated child occurrences                                                    | No Instance-array transition                                 |
| Typing Game client root              | One direct Home Model and `Option<{ roomId, model }>` for a Room occurrence                       | Keep keyed Option storage; the API currently supports arrays |
| Typing Game Home and Room            | Leaf Blocks; players, scores, texts, and game state are domain data                               | No Instance-array transition                                 |
| Typing Game shared/server packages   | Protocol Schemas and server state                                                                 | No client child occurrence storage                           |

Website snippets, guidance, and historical examples are handled by the documentation owner. This audit does not rewrite published examples.

## Library and scaffold consumers

| Consumer                                            | Current child storage                                                                                          | Adoption                                                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| UI Dialog, Popover, Menu, Combobox, and Listbox     | Direct Animation Model                                                                                         | Keep direct child initialization                                                                        |
| UI DatePicker                                       | Direct Popover and Calendar Models                                                                             | Keep direct child initialization                                                                        |
| UI Toast                                            | `entries[]` wraps `animation` with payload, variant, duration, dismissal version, hover state, and swipe state | Keep metadata wrapper and explicit initialization; a ready standard Instance cannot represent the entry |
| Other UI components                                 | Leaf Blocks or stateless views                                                                                 | No Instance-array transition                                                                            |
| UI public/declaration fixtures                      | Deliberate custom child fields, accessor Bindings, and literal occurrence key contracts                        | Retain the coverage of supported nonstandard storage and exact literal keys                             |
| UI VirtualList browser fixture                      | One optional VirtualList Model plus data items                                                                 | Keep optional storage                                                                                   |
| Devtools overlay                                    | Direct Tabs, Listbox, and Slider Models                                                                        | Keep direct child initialization                                                                        |
| Foldkit Query                                       | One query state Model                                                                                          | No repeated Block occurrences                                                                           |
| Foldkit KeyedQuery                                  | HashMap of retained query state, pending generations, and cache policy data                                    | Keep Query-owned cache data; entries are not child Block occurrences                                    |
| Foldkit Machine                                     | Schema-driven transition state                                                                                 | No child occurrence storage                                                                             |
| Markdown and Node packages                          | Rendering/server adapters                                                                                      | No child occurrence storage                                                                             |
| Vite plugin and devtools MCP packages               | Build/server tooling                                                                                           | No application child occurrence storage                                                                 |
| Oxlint plugin                                       | Static analysis                                                                                                | No application child occurrence storage                                                                 |
| `create-foldkit-app` client, SSR, and SSG templates | Graphless initial application                                                                                  | No child occurrence storage to migrate                                                                  |
| Examples E2E package                                | Browser tests hosting the existing applications                                                                | No independent application Model to migrate                                                             |

## Audit method

The review enumerated child construction calls and all `childField`/keyed accessor declarations, then inspected the corresponding parent Schemas, child Schemas, initialization policies, selectors, and views. Array fields were checked against Binding registrations so ordinary domain collections were not mistaken for child storage.

Application files were not changed by this audit. The only eligible existing application, Counters, is migrated and verified by the lead. No new behavior tests are needed for the retained consumers because their code and behavior remain unchanged.
