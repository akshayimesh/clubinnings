-- Up Migration
CREATE TABLE teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Target for team_players' composite FK, so a roster entry can't cross clubs.
  CONSTRAINT teams_id_club_unique UNIQUE (id, club_id)
);

-- Team names are unique within a club, ignoring case.
CREATE UNIQUE INDEX teams_club_name_unique ON teams (club_id, lower(name));

CREATE TABLE players (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
  user_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  full_name  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT players_id_club_unique UNIQUE (id, club_id)
);

CREATE INDEX players_club_id_idx ON players (club_id);
CREATE UNIQUE INDEX players_user_id_unique ON players (user_id) WHERE user_id IS NOT NULL;

CREATE TABLE team_players (
  team_id      uuid NOT NULL,
  player_id    uuid NOT NULL,
  club_id      uuid NOT NULL,
  shirt_number smallint CHECK (shirt_number BETWEEN 0 AND 999),
  is_captain   boolean NOT NULL DEFAULT false,
  added_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_players_pkey PRIMARY KEY (team_id, player_id),
  CONSTRAINT team_players_team_fk FOREIGN KEY (team_id, club_id) REFERENCES teams (id, club_id) ON DELETE CASCADE,
  CONSTRAINT team_players_player_fk FOREIGN KEY (player_id, club_id) REFERENCES players (id, club_id) ON DELETE CASCADE,
  CONSTRAINT team_players_shirt_unique UNIQUE (team_id, shirt_number)
);

-- At most one captain per team.
CREATE UNIQUE INDEX team_players_captain_unique ON team_players (team_id) WHERE is_captain;
CREATE INDEX team_players_player_id_idx ON team_players (player_id);

-- Down Migration
DROP TABLE team_players;
DROP TABLE players;
DROP TABLE teams;
