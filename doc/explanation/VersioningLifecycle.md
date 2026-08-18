# Architecture & Explanation: Decimal SemVer Release Lifecycle

This document explains the release engineering philosophy and version lifecycle rules governing the Paperback ecosystem.

---

## 🔢 The Release Scheme

Paperback follows a base-10 decimal Semantic Versioning scheme with revision letter suffixes:

$$\mathbf{v}[\text{MAJOR}].[\text{MINOR}].[\text{PATCH}][\text{REVISION}]$$

* Example: `v1.6.0`, `v1.6.0a`, `v1.6.0b`, `v1.7.0`, `v1.7.0a`, `v2.0.0`.

---

## 🔄 The 3 Lifecycle Phases

### 1. Revision / Patch Suffixes (`a`, `b`, `c`)
* Within any minor feature release, intermediate iterations, quick bug fixes, and hot patches use letter suffixes:
  * `v1.6.0` ➔ `v1.6.0a` ➔ `v1.6.0b` ➔ `v1.6.0c`

### 2. Minor Feature Rollover (`.1` ➔ `.9`)
* When delivering new feature sets (e.g. new theme systems, new sync engines), increment the minor number and reset the suffix:
  * `v1.6.0c` ➔ `v1.7.0` ➔ `v1.7.0a` ... up to `v1.9.0c`

### 3. Major Generation Rollover (`.9` ➔ `2.0.0`)
* Because the system is base-10 decimal, after `v1.9.0` (and `v1.9.0a, b, c`), the project rolls directly into the next major generation:
  * `v1.9.0c` ➔ `v2.0.0`
  * `v2.9.0c` ➔ `v3.0.0`

---

## 🤖 Automated Version Comparison Engine

The Flutter client contains an embedded version comparison algorithm in [`UpdateService`](../../apps/client/lib/services/update_service.dart):
* Normalizes strings by removing `v` prefixes.
* Splits numbers into major, minor, patch, and revision components.
* Compares letter suffixes alphabetically (`b > a`).
* Compares minor rollovers numerically (`7 > 6`).
* Automatically notifies the user in the About settings card when a newer release tag is published on GitHub!
