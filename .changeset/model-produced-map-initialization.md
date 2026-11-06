---
'foldkit': minor
'create-foldkit-app': patch
---

Allow `makeInitIfMissingStep` to select a child initialization request from the current parent Model. Pass a producer returning `Option<{ key, args }>`; its Model, key and child initializer tuple are inferred from the Binding. The existing concrete configuration form remains supported.

Configuration stays passive. The producer runs once when the connected Step is applied. `None` preserves the exact parent Model without initializing a child; `Some` preserves an existing child or inserts a missing child with its init Commands. Every path requires the original registered Binding and direct-value Record or HashMap storage. Entity selection and handling of unknown URL IDs remain application policy.

Update Workspace, the initialization guide, and app-authoring guidance to demonstrate Model-produced initialization without a separate Step and no-op wrapper.
