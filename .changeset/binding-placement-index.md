---
'foldkit': patch
---

Resolve a child Binding by placement through an index instead of a scan. Deferred policy resolution looked a placement up by distributing a conditional type over every registered Binding, so each lookup cost one structural check per child and a Composition with many children paid for the whole list on every lookup. The lookup now reads a key-remapped index built once per Composition; placements that are not a single string literal, including enum members, and lookup keys that are not single string literals keep the scan, so the resolved Binding is the same for every input. On the Website root `ApplicationBlock` member completion with native TypeScript 7.0.2, the lookup's instantiation-cache misses fell from 1,664 to 150 and its self time from 0.21 s to under 0.01 s.
