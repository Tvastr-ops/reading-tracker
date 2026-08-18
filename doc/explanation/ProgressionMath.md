# Architecture & Explanation: Multi-Tier Progression & Velocity Math

This document details the mathematical algorithms and data structures governing complex multi-tier reading hierarchies, ongoing serialization states, and velocity forecasting.

---

## 📚 Multi-Tier Progression Hierarchies

Standard book trackers assume reading is a single continuous counter (e.g. `Page 45 of 300`). However, Light Novels, Web Serials, and Manga have nuanced multi-tier structures.

Paperback formalizes two progression structures (`progress_structure`):

### 1. `single` Structure
Standard linear progression:
$$\text{Completion Percentage} = \min\left(100, \left(\frac{\text{progress}}{\text{total\_units}}\right) \times 100\right)$$

### 2. `volume_chapter` Structure
Hierarchical progression tracking two distinct levels:
* **Parent Level**: Volumes / Parts (`parent_progress` $\le$ `parent_total`).
* **Child Level**: Chapters / Pages within the active volume (`progress` $\le$ `total_units`).

Depending on publication style, chapters can be:
* **Continuous Multi-Tier**: Chapters count continuously across volumes (e.g. *Vol. 3, Ch. 74 / 150*).
* **Per-Volume Reset Multi-Tier**: Chapters reset to 1 in each volume (e.g. *Vol. 2, Ch. 4 / 12*).

---

## ⚡ Ongoing Serialization Math

For active web serials and weekly manga where `is_ongoing = true` and `total_units` is null:

* `latest_units` represents the newest chapter released by the author.
* `progress` represents the user's current reading position.

$$\text{Chapters Behind} = \max(0, \text{latest\_units} - \text{progress})$$

* If $\text{progress} \ge \text{latest\_units}$, the UI displays **"Caught Up (100%)"**.
* If $\text{progress} < \text{latest\_units}$, the UI displays **"Ch. 26 (119 behind)"**.

---

## 📈 Reading Velocity & Pace Forecasting

When a user logs progress, Paperback recalculates reading velocity from the historical log trail:

$$\text{Delta Progress} = \text{progress}_{\text{newest}} - \text{progress}_{\text{oldest}}$$
$$\text{Delta Days} = \max\left(1, \frac{\text{Timestamp}_{\text{newest}} - \text{Timestamp}_{\text{oldest}}}{86400}\right)$$
$$\text{Reading Pace (units/week)} = \text{round}\left(\left(\frac{\text{Delta Progress}}{\text{Delta Days}}\right) \times 7.0, 1\right)$$

### Annual Goal Pace Needed
To keep users on track for their yearly reading target:

$$\text{Months Remaining} = 12 - \text{Current Month} + 1$$
$$\text{Books Remaining} = \max(0, \text{Yearly Target} - \text{Books Completed})$$
$$\text{Pace Needed (books/mo)} = \text{round}\left(\frac{\text{Books Remaining}}{\text{Months Remaining}}, 1\right)$$
