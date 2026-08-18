# 📖 Paperback Documentation Hub

Welcome to the **Paperback Reading Tracker** documentation suite. 

Our documentation is structured around the **[Diátaxis Framework](https://diataxis.fr/)**, organizing knowledge into four distinct quadrants based on your current need:

```
                       PRACTICAL
                           │
      🎓 TUTORIALS         │      🛠️ HOW-TO GUIDES
   (Learning-oriented)     │     (Problem-oriented)
   "Teach me from scratch" │   "Help me solve a task"
                           │
───────────────────────────┼───────────────────────────
                           │
     💡 EXPLANATION        │       📖 REFERENCE
 (Understanding-oriented)  │   (Information-oriented)
 "Explain why it works"    │  "Give me the dry facts"
                           │
                      THEORETICAL
```

---

## 🧭 Documentation Index

### 🎓 1. Tutorials *(Learning-Oriented)*
Step-by-step lessons to help you get started from zero knowledge:
* **[`QuickStart.md`](./tutorials/QuickStart.md)**: Set up the repository locally, start the development server, and track your first book in under 5 minutes.

---

### 🛠️ 2. How-To Guides *(Problem-Oriented)*
Practical recipes and step-by-step solutions for specific real-world tasks:
* **[`DeployVercelSupabase.md`](./how-to/DeployVercelSupabase.md)**: Deploy the Next.js web application to Vercel and set up your Supabase database.
* **[`BuildAndroidWindows.md`](./how-to/BuildAndroidWindows.md)**: Compile the native Flutter Android release APK and Windows desktop binaries.
* **[`ImportExportCsv.md`](./how-to/ImportExportCsv.md)**: Backup, restore, and migrate your reading library using CSV import and export.

---

### 📖 3. Technical Reference *(Information-Oriented)*
Authoritative, dry technical facts, APIs, schemas, and specifications:
* **[`ApiEndpoints.md`](./reference/ApiEndpoints.md)**: Complete catalog of REST API endpoints, query parameters, authentication headers, and response formats.
* **[`DatabaseSchema.md`](./reference/DatabaseSchema.md)**: Detailed tables, foreign keys, database triggers, RPC functions, and constraints.
* **[`ThemePalettes.md`](./reference/ThemePalettes.md)**: Color token matrix and hex values for all 16 themes across the 8 thematic pairs.

---

### 💡 4. Architecture & Explanation *(Understanding-Oriented)*
Deep dives into the engineering rationale, trade-offs, and design decisions:
* **[`SyncArchitecture.md`](./explanation/SyncArchitecture.md)**: Why offline-first SQLite with two-way dual sync was chosen and how conflict resolution works.
* **[`ProgressionMath.md`](./explanation/ProgressionMath.md)**: How Volume ➔ Chapter hierarchies, ongoing serialization caught-up states, and reading pace forecasting formulas operate.
* **[`VersioningLifecycle.md`](./explanation/VersioningLifecycle.md)**: The decimal SemVer lifecycle philosophy and release management flow.

---

## 📜 Additional Repository Resources
* **[`CHANGELOG.md`](../CHANGELOG.md)**: Chronological record of all releases and improvements.
* **[`DESIGN.md`](../DESIGN.md)**: Original design token specification.
