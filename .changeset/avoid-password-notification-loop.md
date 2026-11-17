---
'foldkit': patch
---

Prevent modal isolation from freezing the page when another script changes `inert` or `aria-hidden`. Apply isolation to newly added background content and preserve external attribute changes while the Dialog is open and during cleanup. External scripts can override background isolation; the Dialog's focus trap stays active. Resolve every matching allowed overlay, including overlays inserted after a Dialog opens.
