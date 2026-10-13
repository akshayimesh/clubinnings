-- Up Migration
CREATE TABLE clubs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  plan       text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'academy')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  email         text NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin', 'coach', 'player')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Emails are unique across all clubs so login needs only email + password.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));
CREATE INDEX users_club_id_idx ON users (club_id);

-- Down Migration
DROP TABLE users;
DROP TABLE clubs;
