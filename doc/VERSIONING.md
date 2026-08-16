# Release Versioning Scheme

Paperback Reader follows a strict base-10 decimal release versioning scheme:

```text
v[MAJOR].[MINOR].[PATCH][REVISION]
```

## 1. Revision / Patch Cycles (`a`, `b`, `c`)
* Within any minor release cycle, intermediate releases, quick patches, and test iterations use letter suffixes:
  * `v1.1.0a` ➔ `v1.1.0b` ➔ `v1.1.0c`

## 2. Minor Rollover Cycles (`.1` ➔ `.9`)
* After `c` (or when ready for the next feature release), increment the minor number and reset the suffix:
  * `v1.1.0c` ➔ `v1.2.0` ➔ `v1.2.0a` ➔ `v1.2.0b` ➔ `v1.2.0c` ➔ `v1.3.0` ... up to `v1.9.0c`

## 3. Major Generation Rollover (`.9` ➔ `2.0.0`)
* The system is base-10 decimal: after `v1.9.0` (and `v1.9.0a, b, c`), the version rolls directly into the next major generation:
  * `v1.9.0c` ➔ `v2.0.0`
  * `v2.0.0c` ➔ `v2.1.0` ➔ ... ➔ `v2.9.0c` ➔ `v3.0.0`
