import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool.js';
import { app, bearer, memberToken, signupClub } from '../helpers/api.js';
import { closeDb, count, resetDb } from '../helpers/db.js';

beforeEach(resetDb);
afterAll(closeDb);

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

/** A club with an admin token, one team and two players. */
async function setupClub(overrides: Parameters<typeof signupClub>[0] = {}) {
  const { token, club } = await signupClub(overrides);
  const team = (await request(app).post('/api/teams').set(bearer(token)).send({ name: '1st XI' })).body.team;
  const asha = (await request(app).post('/api/players').set(bearer(token)).send({ fullName: 'Asha Patel' })).body.player;
  const ben = (await request(app).post('/api/players').set(bearer(token)).send({ fullName: 'Ben Ali' })).body.player;
  return { token, club, team, asha, ben } as {
    token: string;
    club: { id: string };
    team: { id: string };
    asha: { id: string };
    ben: { id: string };
  };
}

const addPlayer = (token: string, teamId: string, body: object) =>
  request(app).post(`/api/teams/${teamId}/players`).set(bearer(token)).send(body);

const roster = async (token: string, teamId: string) =>
  (await request(app).get(`/api/teams/${teamId}`).set(bearer(token))).body.roster as {
    player: { id: string };
    shirtNumber: number | null;
    isCaptain: boolean;
  }[];

describe('POST /api/teams/:teamId/players', () => {
  it('adds a player with a shirt number and captaincy', async () => {
    const { token, team, asha } = await setupClub();
    const res = await addPlayer(token, team.id, { playerId: asha.id, shirtNumber: 7, isCaptain: true });

    expect(res.status).toBe(201);
    expect(res.body.entry).toMatchObject({
      player: { id: asha.id, fullName: 'Asha Patel' },
      shirtNumber: 7,
      isCaptain: true,
      addedAt: expect.any(String),
    });
  });

  it('lets a coach add a player', async () => {
    const { club, team, asha } = await setupClub();
    const coach = await memberToken(club.id, 'coach');
    const res = await addPlayer(coach, team.id, { playerId: asha.id });
    expect(res.status).toBe(201);
    expect(res.body.entry).toMatchObject({ shirtNumber: null, isCaptain: false });
  });

  it('returns 409 when the player is already on the team', async () => {
    const { token, team, asha } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id });
    const res = await addPlayer(token, team.id, { playerId: asha.id });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CONFLICT', message: 'Player is already on this team' });
  });

  it('returns 409 when the shirt number is taken on the team, but allows it on another team', async () => {
    const { token, team, asha, ben } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, shirtNumber: 7 });

    const res = await addPlayer(token, team.id, { playerId: ben.id, shirtNumber: 7 });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('Shirt number 7 is already taken on this team');

    const other = (await request(app).post('/api/teams').set(bearer(token)).send({ name: '2nd XI' })).body.team;
    expect((await addPlayer(token, other.id, { playerId: ben.id, shirtNumber: 7 })).status).toBe(201);
  });

  it('makes the new captain replace the old one', async () => {
    const { token, team, asha, ben } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, isCaptain: true });
    await addPlayer(token, team.id, { playerId: ben.id, isCaptain: true });

    const entries = await roster(token, team.id);
    expect(entries.filter((e) => e.isCaptain).map((e) => e.player.id)).toEqual([ben.id]);
  });

  it('returns 404 for an unknown player or team', async () => {
    const { token, team } = await setupClub();
    const noPlayer = await addPlayer(token, team.id, { playerId: MISSING_ID });
    expect(noPlayer.status).toBe(404);
    expect(noPlayer.body.error.message).toBe('Player not found');

    const noTeam = await addPlayer(token, MISSING_ID, { playerId: MISSING_ID });
    expect(noTeam.status).toBe(404);
    expect(noTeam.body.error.message).toBe('Team not found');
  });

  it.each([
    ['missing playerId', {}],
    ['non-UUID playerId', { playerId: 'abc' }],
    ['negative shirt number', { playerId: MISSING_ID, shirtNumber: -1 }],
    ['shirt number over 999', { playerId: MISSING_ID, shirtNumber: 1000 }],
    ['fractional shirt number', { playerId: MISSING_ID, shirtNumber: 7.5 }],
    ['non-boolean isCaptain', { playerId: MISSING_ID, isCaptain: 'yes' }],
  ])('returns 400 for %s', async (_label, body) => {
    const { token, team } = await setupClub();
    const res = await addPlayer(token, team.id, body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await count('team_players')).toBe(0);
  });
});

describe('PATCH /api/teams/:teamId/players/:playerId', () => {
  it('changes and clears the shirt number', async () => {
    const { token, team, asha } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, shirtNumber: 7 });
    const url = `/api/teams/${team.id}/players/${asha.id}`;

    const changed = await request(app).patch(url).set(bearer(token)).send({ shirtNumber: 10 });
    expect(changed.status).toBe(200);
    expect(changed.body.entry).toMatchObject({ player: { id: asha.id }, shirtNumber: 10 });

    const cleared = await request(app).patch(url).set(bearer(token)).send({ shirtNumber: null });
    expect(cleared.body.entry.shirtNumber).toBeNull();
  });

  it('swaps the captain', async () => {
    const { token, team, asha, ben } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, isCaptain: true });
    await addPlayer(token, team.id, { playerId: ben.id });

    const res = await request(app)
      .patch(`/api/teams/${team.id}/players/${ben.id}`)
      .set(bearer(token))
      .send({ isCaptain: true });

    expect(res.status).toBe(200);
    expect(res.body.entry.isCaptain).toBe(true);
    const entries = await roster(token, team.id);
    expect(entries.find((e) => e.player.id === asha.id)?.isCaptain).toBe(false);
  });

  it('returns 409 for a taken shirt number', async () => {
    const { token, team, asha, ben } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, shirtNumber: 7 });
    await addPlayer(token, team.id, { playerId: ben.id, shirtNumber: 8 });

    const res = await request(app)
      .patch(`/api/teams/${team.id}/players/${ben.id}`)
      .set(bearer(token))
      .send({ shirtNumber: 7 });
    expect(res.status).toBe(409);
  });

  it('returns 404 and keeps the captain when the player is not on the team', async () => {
    const { token, team, asha, ben } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id, isCaptain: true });

    const res = await request(app)
      .patch(`/api/teams/${team.id}/players/${ben.id}`)
      .set(bearer(token))
      .send({ isCaptain: true });

    expect(res.status).toBe(404);
    expect((await roster(token, team.id))[0]?.isCaptain).toBe(true);
  });

  it('returns 400 for an empty body', async () => {
    const { token, team, asha } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id });
    const res = await request(app).patch(`/api/teams/${team.id}/players/${asha.id}`).set(bearer(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for a non-UUID player id', async () => {
    const { token, team } = await setupClub();
    const res = await request(app).patch(`/api/teams/${team.id}/players/nope`).set(bearer(token)).send({ isCaptain: true });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/teams/:teamId/players/:playerId', () => {
  it('removes the player from the team but keeps the player record', async () => {
    const { token, team, asha } = await setupClub();
    await addPlayer(token, team.id, { playerId: asha.id });

    const res = await request(app).delete(`/api/teams/${team.id}/players/${asha.id}`).set(bearer(token));

    expect(res.status).toBe(204);
    expect(await count('team_players')).toBe(0);
    expect(await count('players')).toBe(2);
  });

  it('returns 404 when the player is not on the team', async () => {
    const { token, team, asha } = await setupClub();
    const res = await request(app).delete(`/api/teams/${team.id}/players/${asha.id}`).set(bearer(token));
    expect(res.status).toBe(404);
  });
});

describe('tenant isolation', () => {
  async function twoClubs() {
    const a = await setupClub();
    const b = await setupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });
    await addPlayer(b.token, b.team.id, { playerId: b.asha.id, shirtNumber: 1, isCaptain: true });
    return { a, b };
  }

  async function clubBUnchanged(b: Awaited<ReturnType<typeof setupClub>>) {
    const { rows } = await pool.query(
      `SELECT t.name, tp.player_id, tp.shirt_number, tp.is_captain
       FROM teams t LEFT JOIN team_players tp ON tp.team_id = t.id WHERE t.club_id = $1`,
      [b.club.id],
    );
    expect(rows).toEqual([{ name: '1st XI', player_id: b.asha.id, shirt_number: 1, is_captain: true }]);
  }

  it('returns 404 when reading, renaming or deleting another club team', async () => {
    const { a, b } = await twoClubs();
    const url = `/api/teams/${b.team.id}`;

    expect((await request(app).get(url).set(bearer(a.token))).status).toBe(404);
    expect((await request(app).patch(url).set(bearer(a.token)).send({ name: 'Hacked' })).status).toBe(404);
    expect((await request(app).delete(url).set(bearer(a.token))).status).toBe(404);
    await clubBUnchanged(b);
  });

  it('returns 404 when changing another club roster', async () => {
    const { a, b } = await twoClubs();
    const entryUrl = `/api/teams/${b.team.id}/players/${b.asha.id}`;

    expect((await addPlayer(a.token, b.team.id, { playerId: a.asha.id })).status).toBe(404);
    expect((await request(app).patch(entryUrl).set(bearer(a.token)).send({ isCaptain: false })).status).toBe(404);
    expect((await request(app).patch(entryUrl).set(bearer(a.token)).send({ shirtNumber: 99 })).status).toBe(404);
    expect((await request(app).delete(entryUrl).set(bearer(a.token))).status).toBe(404);
    await clubBUnchanged(b);
  });

  it('returns 404 when adding another club player to your own team', async () => {
    const { a, b } = await twoClubs();
    const res = await addPlayer(a.token, a.team.id, { playerId: b.ben.id });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Player not found');
    expect(await roster(a.token, a.team.id)).toEqual([]);
  });

  it('making a captain in one club leaves the other club captain alone', async () => {
    const { a, b } = await twoClubs();
    await addPlayer(a.token, a.team.id, { playerId: a.asha.id, isCaptain: true });
    await clubBUnchanged(b);
  });

  it('rejects a cross-club roster row at the database level', async () => {
    const { a, b } = await twoClubs();
    await expect(
      pool.query('INSERT INTO team_players (team_id, player_id, club_id) VALUES ($1, $2, $3)', [
        a.team.id,
        b.ben.id,
        a.club.id,
      ]),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
