---
'foldkit': patch
---

A failing `Story.story` now appends a step report to the thrown error. Before, the error showed only the assertion that failed, so you had to count steps to find where the story stopped and which Message got it there. The report lists every step in order: `✓` for steps that ran, `✗` for the step that threw, and a blank mark for steps that never ran. Each step that ran shows how it changed the Model (as `path: before → after` lines) and which Commands it emitted. The failed step shows the first line of the error, the current Model, and the pending Commands. When Commands stay unresolved at the end, an `End` row carries the failure. Values print on one short line, long strings and arrays are cut, and `Redacted` values print as their placeholder, never their content. The original Error instance and its message stay as they were, with the report added after the message, so `toThrow` checks and assertion diffs keep working. `Scene` failures are unchanged.
