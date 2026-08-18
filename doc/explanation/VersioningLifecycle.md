# Versioning Lifecycle

Release lifecycle rules and version comparison logic in the Paperback ecosystem.

---

## Release Format

Paperback follows a decimal Semantic Versioning scheme with alphabetical revision suffixes:

$$\mathbf{v}[\text{MAJOR}].[\text{MINOR}].[\text{PATCH}][\text{REVISION}]$$

* Examples: `v1.6.0`, `v1.6.0a`, `v1.6.0b`, `v1.7.0`, `v1.7.0a`, `v2.0.0`.

---

## Lifecycle Phases

### 1. Revision / Patch Iterations (`a`, `b`, `c`)
Intermediate fixes and minor patches within an active release track:
$$\text{v1.6.0} \longrightarrow \text{v1.6.0a} \longrightarrow \text{v1.6.0b} \longrightarrow \text{v1.6.0c}$$

### 2. Minor Feature Rollover (`.1` -> `.9`)
New functional releases increment the minor version and reset the suffix:
$$\text{v1.6.0c} \longrightarrow \text{v1.7.0} \longrightarrow \text{v1.7.0a} \dots \longrightarrow \text{v1.9.0c}$$

### 3. Major Generation Rollover (`.9` -> `2.0.0`)
Base-10 rollover into the next major platform generation:
$$\text{v1.9.0c} \longrightarrow \text{v2.0.0}$$

---

## Update Resolution Engine

The Flutter client's [`UpdateService`](../../apps/client/lib/services/update_service.dart) implements native version parsing against the GitHub Releases API:
* Strips `v` prefixes.
* Splits numbers into numeric components (major, minor, patch).
* Compares alphabetical suffixes (`b > a`).
* Prompts in-app update notifications when newer release tags are published.
