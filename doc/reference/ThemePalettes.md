# Technical Reference: 16 Thematic Color Palettes

The Paperback Flutter Client features **8 symmetrical Light $\leftrightarrow$ Dark thematic pairs** (16 themes total). Each pair is tuned for high-contrast legibility, tactile paper authenticity, and distinct accent identity.

---

## 🎨 Symmetrical Theme Matrix

| Pair # | Light Variant | Dark Variant | Canvas (Light / Dark) | Accent Hex | Thematic Mood |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **01** | **Classic Paperback** | **Charcoal Ledger** | `#FCFAED` / `#1B1C15` | `#BB0114` (Crimson) | Vintage physical paperbacks, archival ledger |
| **02** | **Manga Inkpaper** | **Manga Noir (OLED)** | `#F4F4F6` / `#000000` | `#1D4ED8` & `#FF2E4D` | Shonen newsprint vs. Pitch-black OLED neon |
| **03** | **Matcha & Washi** | **Midnight Matcha** | `#F5F7F2` / `#161D19` | `#3D6E50` & `#4ADE80` | Japanese mulberry washi, Kyoto tea garden |
| **04** | **Retro Pulp Comic** | **Dark Academia** | `#FAF4E8` / `#1D1714` | `#D97706` & `#D4A373` | Aged pulp novel, candlelit mahogany study |
| **05** | **Sakura Manuscript** | **Midnight Sakura**| `#FAF5F7` / `#1E1720` | `#BE185D` & `#F472B6` | Cherry blossom stationery, nocturnal plum |
| **06** | **Nordic Glacier** | **Nordic Night (Fjord)**| `#F2F7F9` / `#141C22` | `#0891B2` & `#38BDF8` | Arctic ice, deep Scandinavian fjord water |
| **07** | **Drafting Vellum** | **Cyanotype Blueprint**| `#FDF8EE` / `#0E1D2D` | `#EA580C` & `#FF8C42` | Architectural vellum, sun-exposed blueprint |
| **08** | **Crumpled Kraft** | **Charred Papyrus** | `#EFE9DC` / `#191816` | `#C25E2E` & `#D97736` | Raw unbleached kraft paper, terracotta wax seal |

---

## 🧱 Color Token Architecture

Every theme defines 4 core tokens in `AppThemeVariant`:

1. `primary`: Signature branding and action button fill.
2. `background`: Scaffolding and main scrollable surface.
3. `cardBackground`: Brutalist card fill with 1.5px ink border.
4. `accent`: High-visibility chips, badges, and progress bar gradients.
