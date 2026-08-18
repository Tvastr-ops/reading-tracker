# Theme Palettes Reference

Color token specifications and hex values for all 16 client themes (8 symmetrical light/dark pairs).

---

## Palette Matrix

| Pair | Light Theme | Dark Theme | Canvas (Light / Dark) | Accent Hex |
| :---: | :--- | :--- | :--- | :--- |
| **01** | **Classic Paperback** | **Charcoal Ledger** | `#FCFAED` / `#1B1C15` | `#BB0114` |
| **02** | **Manga Inkpaper** | **Manga Noir (OLED)** | `#F4F4F6` / `#000000` | `#1D4ED8` / `#FF2E4D` |
| **03** | **Matcha & Washi** | **Midnight Matcha** | `#F5F7F2` / `#161D19` | `#3D6E50` / `#4ADE80` |
| **04** | **Retro Pulp Comic** | **Dark Academia** | `#FAF4E8` / `#1D1714` | `#D97706` / `#D4A373` |
| **05** | **Sakura Manuscript** | **Midnight Sakura** | `#FAF5F7` / `#1E1720` | `#BE185D` / `#F472B6` |
| **06** | **Nordic Glacier** | **Nordic Night (Fjord)**| `#F2F7F9` / `#141C22` | `#0891B2` / `#38BDF8` |
| **07** | **Drafting Vellum** | **Cyanotype Blueprint**| `#FDF8EE` / `#0E1D2D` | `#EA580C` / `#FF8C42` |
| **08** | **Crumpled Kraft** | **Charred Papyrus** | `#EFE9DC` / `#191816` | `#C25E2E` / `#D97736` |

---

## Token Structure

Each theme variant defines four core surface tokens in `AppThemeVariant`:

1. `primary`: Primary branding and button fills.
2. `background`: Main scaffolding and viewport background.
3. `cardBackground`: Card surfaces with 1.5px ink borders.
4. `accent`: Progress fills, badges, and active state highlights.
