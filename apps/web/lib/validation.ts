import type { Book } from './types';

const ALLOWED_UNIT_TYPES = ['pages', 'chapters', 'words', 'percent', 'volumes', 'units'];
const ALLOWED_STRUCTURES = ['single', 'volume_chapter', 'part_chapter'];

/**
 * Validates progression and hierarchy fields for state invariants.
 * Returns an error string if invalid, or null if valid.
 */
export function validateProgressionFields(fields: Partial<Book>): string | null {
  // 1. unit_type validation
  if (fields.unit_type != null && !ALLOWED_UNIT_TYPES.includes(fields.unit_type)) {
    return `Invalid unit_type. Must be one of: ${ALLOWED_UNIT_TYPES.join(', ')}`;
  }

  // 2. progress_structure validation
  if (
    fields.progress_structure != null &&
    !ALLOWED_STRUCTURES.includes(fields.progress_structure)
  ) {
    return `Invalid progress_structure. Must be one of: ${ALLOWED_STRUCTURES.join(', ')}`;
  }

  // 3. Single structure must not carry parent progress or parent total
  if (fields.progress_structure === 'single') {
    if (fields.parent_progress != null || fields.parent_total != null) {
      return 'Single progress structure cannot have parent_progress or parent_total';
    }
  }

  // 4. Non-negative checks for numeric progression fields
  if (fields.progress != null) {
    if (
      typeof fields.progress !== 'number' ||
      !Number.isFinite(fields.progress) ||
      fields.progress < 0
    ) {
      return 'Progress must be a non-negative number';
    }
  }

  if (fields.total_units != null) {
    if (
      typeof fields.total_units !== 'number' ||
      !Number.isFinite(fields.total_units) ||
      fields.total_units < 0
    ) {
      return 'Total units must be a non-negative number';
    }
  }

  if (fields.parent_progress != null) {
    if (
      typeof fields.parent_progress !== 'number' ||
      !Number.isFinite(fields.parent_progress) ||
      fields.parent_progress < 0
    ) {
      return 'Parent progress must be a non-negative number';
    }
  }

  if (fields.parent_total != null) {
    if (
      typeof fields.parent_total !== 'number' ||
      !Number.isFinite(fields.parent_total) ||
      fields.parent_total < 0
    ) {
      return 'Parent total must be a non-negative number';
    }
  }

  if (fields.latest_units != null) {
    if (
      typeof fields.latest_units !== 'number' ||
      !Number.isFinite(fields.latest_units) ||
      fields.latest_units < 0
    ) {
      return 'Latest units must be a non-negative number';
    }
  }

  // 5. Relational bounds
  // Fixed work: progress <= total_units
  if (
    !fields.is_ongoing &&
    fields.progress != null &&
    fields.total_units != null &&
    fields.progress > fields.total_units
  ) {
    return `Progress (${fields.progress}) cannot exceed total units (${fields.total_units})`;
  }

  // Ongoing work: progress <= latest_units (if latest_units is known)
  if (
    fields.is_ongoing &&
    fields.progress != null &&
    fields.latest_units != null &&
    fields.progress > fields.latest_units
  ) {
    return `Progress (${fields.progress}) cannot exceed latest released units (${fields.latest_units})`;
  }

  // Hierarchy bound: parent_progress <= parent_total
  if (
    fields.parent_progress != null &&
    fields.parent_total != null &&
    fields.parent_progress > fields.parent_total
  ) {
    return `Parent progress (${fields.parent_progress}) cannot exceed parent total (${fields.parent_total})`;
  }

  // 6. Boolean type check
  if (fields.is_ongoing != null && typeof fields.is_ongoing !== 'boolean') {
    return 'is_ongoing must be a boolean';
  }

  return null;
}
