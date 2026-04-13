---
'foldkit': minor
---

**Breaking**: renamed `Ui.Transition.Hidden` to `Ui.Transition.Hid`. The Message convention is verb-first past-tense events describing what happened (`Showed`, `Clicked`, `Submitted`), and `Hidden` is the past participle of hide — grammatically mismatched with its sibling `Showed`. `Hid` is the correct past simple form.

Migration: replace `Ui.Transition.Hidden()` with `Ui.Transition.Hid()` at every call site. TypeScript will surface any remaining references as errors.
