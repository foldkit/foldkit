---
'create-foldkit-app': patch
'@foldkit/oxlint-plugin': patch
---

Recommend exporting used Step helpers from a feature's Definition module and importing those helpers into split implementation files. Colocated features destructure helpers locally; modules with several owners can retain qualified calls. Feature barrels expose the completed Block.

Track local and imported helper provenance in child-state and child-Message lint checks. The rules preserve the owning Definition through helper aliases, including `.fromMessage`, and distinguish wrong owners and shadowed names.
