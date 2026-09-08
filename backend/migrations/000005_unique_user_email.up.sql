-- users had UNIQUE(company_id, email), so the same address could be registered
-- against several companies. Login only takes an email and a password, with no
-- way to say which tenant, so it resolved to whichever row the planner returned
-- first: the second account was created successfully and then permanently
-- locked out — its own password returned "invalid credentials".
--
-- Login's contract is what settles this: an address identifies one account.
--
-- Existing duplicates are NOT deleted. The oldest account keeps the address,
-- which is the one that could already log in, so no working login changes. The
-- rest are suffixed to make them unique and obvious, keeping their data intact
-- and recoverable by an administrator.
UPDATE users u
SET email = u.email || '+locked-' || left(u.id::text, 8)
FROM (
  SELECT id, row_number() OVER (PARTITION BY lower(email) ORDER BY created_at, id) AS rn
  FROM users
) ranked
WHERE u.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
