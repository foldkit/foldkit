# Testing

## Story and Scene {#overview}

Foldkit tests at two boundaries. Story calls update directly. Scene enters through the rendered view. Neither test runs a browser or executes the Effects inside Commands, so both stay deterministic and fast.

|                | Story                                        | Scene                                              |
| -------------- | -------------------------------------------- | -------------------------------------------------- |
| Enters through | A Message                                    | An interaction or lifecycle result                 |
| Observes       | Model changes, Commands, and OutMessages     | Rendered output, Commands, Mounts, and OutMessages |
| Best suited to | Update logic, edge cases, and Command wiring | User flows, view behavior, and accessibility       |

Use both. Story proves the state machine behaves correctly. Scene proves that a person can reach that behavior through the view.

Name each file for the boundary it tests:

- `story.test.ts` drives update.
- `scene.test.ts` drives the rendered view.
- When one folder has several tests of the same kind, prefix the subject: `login.story.test.ts`.
- Keep root-level Scene tests for flows that cross pages. Colocate page and Submodel tests with the code they exercise.

The names stay accurate whether update and view live together or in separate files. See [Project Organization](/patterns/project-organization) for the full layout.

## Story

`story` starts from a Model, sends Messages through update, and keeps Commands as data until the test supplies their result Messages. See the [Story](/testing/story) page for the full API.

Story can test a root update or a child update in isolation. The update function is the contract at either level.

::Snippet{name="counterCommandsTest" label="Story example"}

## Scene

`scene` renders the view after every step. Locators find elements by role, label, placeholder, and visible text. Interactions invoke the view's event handlers, while cause-named steps supply Subscription, ManagedResource, and CustomElement results. Scene also tracks pending Commands and Mounts. See the [Scene](/testing/scene) page for the full API.

Scene can also start at the root or at a child Submodel. `withViewInputs` adapts a Submodel view that needs ViewInputs, and `expectOutMessage` checks a child's OutMessage directly.

Choose the level by ownership. Test a Submodel's rendering, interactions, Commands, and OutMessages at the Submodel. Test parent folding, lifted Commands, route changes, and parent-computed ViewInputs at the root. Those behaviors cross the boundary and cannot be observed from the child.

::Snippet{name="sceneWeatherFlow" label="Scene example"}
