---
'foldkit': patch
---

Reject the removed Command `execute` configuration at runtime with guidance for generator handlers and host-owned `toLayer` providers. JavaScript and previously compiled callers now fail at declaration instead of later encountering a missing handler.
