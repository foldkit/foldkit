---
'foldkit': minor
---

Rename all Completed/Succeeded/Failed Messages to verb-first order

All Message prefixes now use verb-first naming that mirrors the corresponding Command name. This makes Command-to-Message pairs instantly recognizable: Command `LockScroll` → Message `CompletedLockScroll`.

**Breaking changes — UI component Messages:**

- `CompletedDialogShow` → `CompletedShowDialog`
- `CompletedDialogClose` → `CompletedCloseDialog`
- `CompletedItemsFocus` → `CompletedFocusItems`
- `CompletedButtonFocus` → `CompletedFocusButton`
- `CompletedScrollLock` → `CompletedLockScroll`
- `CompletedScrollUnlock` → `CompletedUnlockScroll`
- `CompletedInertSetup` → `CompletedSetupInert`
- `CompletedInertTeardown` → `CompletedTeardownInert`
- `CompletedItemClick` → `CompletedClickItem`
- `CompletedFocusAdvance` → `CompletedAdvanceFocus`
- `CompletedPanelFocus` → `CompletedFocusPanel`
- `CompletedInputFocus` → `CompletedFocusInput`
- `CompletedTabFocus` → `CompletedFocusTab`
- `CompletedOptionFocus` → `CompletedFocusOption`

**Migration:** Update all references to the old names.
