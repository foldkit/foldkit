---
'foldkit': patch
---

Reduce production bundles by about 4.4 KB gzip by defining HTML attributes once and constructing their builders at module load. HTML, SVG, and MathML builders keep the same API and behavior, with specialized attribute handlers prepared before rendering.
