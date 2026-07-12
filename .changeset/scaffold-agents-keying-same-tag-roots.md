---
'create-foldkit-app': patch
---

Update the keying rule in the generated `AGENTS.md`: key each branch's root element directly when branches at the same DOM position share a root tag, never a wrapper element introduced to carry the key, and skip keys entirely when the branch root tags all differ, since a tag change already forces a full replacement.
