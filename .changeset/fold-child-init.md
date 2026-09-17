---
'foldkit': minor
'create-foldkit-app': patch
---

Add `Update.foldChildInit` to build a parent Model from a child init or boot result, map its Commands, and handle or forward its OutMessage. OutMessage folds receive the completed parent Model and `FoldContext`; their Commands follow the child Commands, and a derived parent OutMessage takes precedence over forwarding.

Update the scaffold guidance to use `Update.foldChildInit` for child init and boot results.
