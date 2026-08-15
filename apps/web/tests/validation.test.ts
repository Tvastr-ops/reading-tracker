import assert from 'node:assert';
import { test } from 'node:test';
import { validateProgressionFields } from '../lib/validation';

test('validateProgressionFields allows valid single structure books', () => {
  const valid = {
    progress: 100,
    total_units: 300,
    unit_type: 'pages',
    progress_structure: 'single',
    is_ongoing: false,
  };
  assert.strictEqual(validateProgressionFields(valid as any), null);
});

test('validateProgressionFields rejects negative progress or totals', () => {
  assert.strictEqual(
    validateProgressionFields({ progress: -5 }),
    'Progress must be a non-negative number',
  );
  assert.strictEqual(
    validateProgressionFields({ total_units: -10 }),
    'Total units must be a non-negative number',
  );
  assert.strictEqual(
    validateProgressionFields({ parent_progress: -1 }),
    'Parent progress must be a non-negative number',
  );
  assert.strictEqual(
    validateProgressionFields({ parent_total: -1 }),
    'Parent total must be a non-negative number',
  );
  assert.strictEqual(
    validateProgressionFields({ latest_units: -1 }),
    'Latest units must be a non-negative number',
  );
});

test('validateProgressionFields rejects progress exceeding total on fixed works', () => {
  const err = validateProgressionFields({
    progress: 350,
    total_units: 300,
    is_ongoing: false,
  });
  assert.strictEqual(err, 'Progress (350) cannot exceed total units (300)');
});

test('validateProgressionFields rejects progress exceeding latest_units on ongoing works', () => {
  const err = validateProgressionFields({
    progress: 210,
    latest_units: 200,
    is_ongoing: true,
  });
  assert.strictEqual(err, 'Progress (210) cannot exceed latest released units (200)');
});

test('validateProgressionFields rejects parent_progress exceeding parent_total', () => {
  const err = validateProgressionFields({
    progress_structure: 'volume_chapter',
    parent_progress: 6,
    parent_total: 5,
  });
  assert.strictEqual(err, 'Parent progress (6) cannot exceed parent total (5)');
});

test('validateProgressionFields rejects parent fields on single progress structure', () => {
  const err = validateProgressionFields({
    progress_structure: 'single',
    parent_progress: 2,
  });
  assert.strictEqual(err, 'Single progress structure cannot have parent_progress or parent_total');
});

test('validateProgressionFields rejects invalid unit_type or structure', () => {
  assert.ok(validateProgressionFields({ unit_type: 'invalid_unit' as any }));
  assert.ok(validateProgressionFields({ progress_structure: 'invalid_struct' as any }));
});
