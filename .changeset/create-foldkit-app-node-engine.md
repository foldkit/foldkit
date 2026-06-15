---
'create-foldkit-app': patch
---

Raise the declared minimum Node version to 22.22.2. The bundled effect
dependency pulls in ini, which requires Node ^22.22.2, ^24.15.0, or >=26.0.0,
so the previous >=22.19.0 declaration understated the real requirement and
surfaced an EBADENGINE warning when installing on Node 22.19.0.
