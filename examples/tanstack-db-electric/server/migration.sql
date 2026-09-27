DO $migration$
BEGIN
  CREATE TABLE IF NOT EXISTS items (
    id text PRIMARY KEY,
    text text NOT NULL,
    is_completed boolean NOT NULL DEFAULT false,
    created_at double precision NOT NULL
  );

  ALTER TABLE items REPLICA IDENTITY FULL;
END
$migration$;
