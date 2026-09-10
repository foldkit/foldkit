# Messages

## Event Names {#events}

Messages record what happened. They do not tell update what to do. Name them as verb-first, past-tense facts such as `SubmittedUsernameForm`, `PressedKey`, and `RemovedCartItem`.

Common prefixes make the source of a fact visible:

| Prefix                 | Use                                                       | Example                     |
| ---------------------- | --------------------------------------------------------- | --------------------------- |
| `Clicked*`             | A particular button or control was clicked.               | `ClickedAddToCart`          |
| `Updated*`             | An input value changed.                                   | `UpdatedSearchInput`        |
| `Succeeded*`/`Failed*` | A Command completed with a meaningful success or failure. | `SucceededFetchUser`        |
| `Completed*`           | Any other Command result.                                 | `CompletedFocusSearchInput` |
| `Got*`                 | A parent received a child Submodel result.                | `GotSearchMessage`          |

Avoid imperative names such as `SetCartItems`, `UpdateSearchText`, and `MutateUserState`. Those names prescribe a transition before update has seen the current Model. A fact leaves the decision where it belongs: in update.

## Command Result Names {#command-results}

For an infallible Command, add `Completed` to the Command name. `FocusSearchInput` produces `CompletedFocusSearchInput`, and `LockScroll` produces `CompletedLockScroll`.

Name the Command for what its `execute` body does, not the later Model transition. A timer that only waits before update begins a dismissal is `WaitBeforeDismissal`, not `DismissAfter`. Its result is `CompletedWaitBeforeDismissal`.

A payload does not change the rule. `DetermineStartTime` produces `CompletedDetermineStartTime({ startTime })`, and `GenerateCardId` produces `CompletedGenerateCardId({ cardId })`. Names such as `DeterminedStartTime` hide the Command-to-Message pair.

When a Command can meaningfully fail, use the same pairing with `Succeeded` and `Failed`: `FetchUser` produces `SucceededFetchUser` or `FailedFetchUser`.

The exception is a Message with more than one cause. Name that Message for the shared fact. For example, `EndedAnimation` can come from `WaitForAnimationSettled` or a component-specific Command that races animation settlement against another event.

## Descriptive Results {#no-noop}

Never use a generic `NoOp` Message. A Command result still records a fact when its update handler leaves the Model unchanged. For example: `CompletedFocusSearchInput` confirms that `FocusSearchInput` finished, even when the handler returns `{ model }`.

Descriptive results keep DevTools and tests readable. A timeline containing `OpenedDialog`, `CompletedFocusSearchInput`, and `CompletedLockScroll` shows which work finished without requiring a reader to inspect the Command definitions.
