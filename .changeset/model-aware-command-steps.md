---
'foldkit': minor
'@foldkit/oxlint-plugin': patch
---

Make `Definition.makeCommandsStep` accept a Model callback instead of a Command collection. The callback runs when the Step is applied and can use the current Model while retaining the same Model object and precise Command requirements.

Replace `Definition.makeCommandsStep(commands)` with `Definition.makeCommandsStep(() => commands)`. Use `Definition.makeCommandsStep(model => [Save({ value: model.value })])` when Commands depend on the Model. Creating the Step remains passive; Runtime executes its returned Commands.

Recognize owned `makeCommandsStep` callbacks in the child Message construction lint rule, so legitimate child-owned callbacks retain their ownership context while parent construction remains rejected.
