-- Migration v10: Database-level CHECK constraints for progression and hierarchy metrics

alter table books drop constraint if exists chk_total_units;
alter table books add constraint chk_total_units check (total_units is null or total_units >= 0);

alter table books drop constraint if exists chk_parent_progress;
alter table books add constraint chk_parent_progress check (parent_progress is null or parent_progress >= 0);

alter table books drop constraint if exists chk_parent_total;
alter table books add constraint chk_parent_total check (parent_total is null or parent_total >= 0);

alter table books drop constraint if exists chk_latest_units;
alter table books add constraint chk_latest_units check (latest_units is null or latest_units >= 0);
