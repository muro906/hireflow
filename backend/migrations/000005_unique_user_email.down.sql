-- Drops the global uniqueness constraint. The "+locked-" suffixes are left in
-- place: which account should hold the bare address is a decision for whoever
-- reverts this, and rewriting them here could resurrect a duplicate.
DROP INDEX users_email_lower_key;
