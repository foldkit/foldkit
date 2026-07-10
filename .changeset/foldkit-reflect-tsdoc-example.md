---
'foldkit': patch
---

Update the `Submodel.Reflect` TSDoc example to use `Slider.reflectRange`. The previous example referenced the Listbox's `reflectSelectedItem`, which `@foldkit/ui` removed when the Listbox selection moved to the parent Model. Docs only, no runtime change.

Part of #676.
