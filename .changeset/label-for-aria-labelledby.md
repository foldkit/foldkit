---
'foldkit': minor
---

Switch Ui.Input, Ui.Textarea, and Ui.Select label association from aria-labelledby to the standard label[for] → input[id] pattern. Remove the now-unused labelId export from all three components. Add aria-labelledby reverse lookup to getByLabel so it resolves elements whose aria-labelledby points to a label with matching text.
