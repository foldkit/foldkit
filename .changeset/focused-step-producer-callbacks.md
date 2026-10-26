---
'foldkit': minor
'@foldkit/ui': patch
'@foldkit/oxlint-plugin': patch
'create-foldkit-app': patch
---

Standardize the focused Step helpers on producer callbacks. `Definition.makeFieldsStep`, `makeCommandsStep`, and `makeOutMessageStep` receive the current Model and, when used as Message-dependent handlers, the exact Message. All three expose `.fromMessage` for a payload-only producer whose returned handler retains the Model-first convention.

```ts
const update = EditorComposition.makeUpdate({
  UpdatedTitle: EditorDefinition.makeFieldsStep.fromMessage(({ title }) => ({
    title: () => title,
  })),
  RequestedSaveTitle: EditorDefinition.makeCommandsStep((model, { title }) => [
    SaveTitle({ issueId: model.issueId, title }),
  ]),
  ClickedClose: EditorDefinition.makeOutMessageStep(() => OutMessage.Closed()),
  CompletedSaveTitle: EditorDefinition.makeNoopStep(),
})
```

Replace the value-taking `makeOutMessageStep(value)` form with `makeOutMessageStep(() => value)`. No value overload remains. `makeCommandsStep` remains callback-only, and `makeNoopStep()` is unchanged. Zero-argument and Model-only producers return reusable unary Steps; Message-dependent producers return handlers that require that Message. Construction remains passive. Producers run when applied, and Commands-only and OutMessage-only helpers preserve the incoming Model identity.

Preserve precise result channels, Service requirements, constructor errors, and child registration evidence. Pass compatible existing Steps directly as handlers, map payloads explicitly when constructing a different Message or OutMessage, and retain direct results for cohesive mixed transitions. `Update.combineSteps` continues rejecting OutMessage-producing Steps.

Migrate eligible in-repo consumers and authoring guidance. Lint recognizes focused callbacks and `.fromMessage` in handler records while retaining child-state and Message ownership checks and their documented local-provenance limits.
