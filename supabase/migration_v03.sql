-- Migration v3: denormalized reading pace on books.
-- Run this once in the Supabase SQL editor.
--
-- Stores units/week, recomputed and saved by the reading-log endpoint every
-- time a log entry is added. Storing it here (rather than computing it live
-- from reading_log at read time) is what lets the main table/grid view show
-- pace for every "Reading" book without an extra query per row.

alter table books add column if not exists reading_pace numeric;
