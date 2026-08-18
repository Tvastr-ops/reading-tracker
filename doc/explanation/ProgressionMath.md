# Progression & Velocity Calculations

Mathematical algorithms for multi-tier hierarchies, ongoing serialization states, and velocity metrics.

---

## Progression Structures

Paperback formalizes two progression structures (`progress_structure`):

### 1. Single Tier (`single`)
Linear unit progression (pages, chapters):

$$\text{Completion Percentage} = \min\left(100, \left(\frac{\text{progress}}{\text{total\_units}}\right) \times 100\right)$$

### 2. Multi-Tier (`volume_chapter`)
Hierarchical progression tracking two independent dimensions:
* **Parent Level**: Volumes / Parts (`parent_progress` $\le$ `parent_total`).
* **Child Level**: Chapters / Pages within the active volume (`progress` $\le$ `total_units`).

---

## Ongoing Serialization Metrics

For serialized web fiction and manga where `is_ongoing = true` and `total_units` is null:

* `latest_units` represents the newest released chapter count.
* `progress` represents the user's current reading position.

$$\text{Chapters Behind} = \max(0, \text{latest\_units} - \text{progress})$$

* $\text{progress} \ge \text{latest\_units} \implies \text{Status: "Caught Up"}$
* $\text{progress} < \text{latest\_units} \implies \text{Status: "X behind"}$

---

## Velocity & Pace Forecasting

When logging progress, velocity is calculated from historical log entries:

$$\text{Delta Progress} = \text{progress}_{\text{newest}} - \text{progress}_{\text{oldest}}$$
$$\text{Delta Days} = \max\left(1, \frac{\text{Timestamp}_{\text{newest}} - \text{Timestamp}_{\text{oldest}}}{86400}\right)$$
$$\text{Reading Pace (units/week)} = \text{round}\left(\left(\frac{\text{Delta Progress}}{\text{Delta Days}}\right) \times 7.0, 1\right)$$

### Annual Target Pace

$$\text{Months Remaining} = 12 - \text{Current Month} + 1$$
$$\text{Books Remaining} = \max(0, \text{Yearly Target} - \text{Books Completed})$$
$$\text{Required Pace (books/month)} = \text{round}\left(\frac{\text{Books Remaining}}{\text{Months Remaining}}, 1\right)$$
