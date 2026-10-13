import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app, bearer, memberToken, signupClub } from '../helpers/api.js';
import { closeDb, count, resetDb } from '../helpers/db.js';

beforeEach(resetDb);
afterAll(closeDb);

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

async function createTeam(token: string, name = '1st XI') {
  const res = await request(app).post('/api/teams').set(bearer(token)).send({ name });
  if (res.status !== 201) throw new Error(`createTeam failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.team as { id: string; clubId: string; name: string; playerCount: number };
}

async function createPlayer(token: string, fullName = 'Asha Patel') {
  const res = await request(app).post('/api/players').set(bearer(token)).send({ fullName });
  if (res.status !== 201) throw new Error(`createPlayer failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.player as { id: string; clubId: string; fullName: string };
}

describe('POST /api/teams', () => {
  it('lets an admin create a team in their club', async () => {
    const { token, club } = await signupClub();
    const res = await request(app).post('/api/teams').set(bearer(token)).send({ name: '  1st XI ' });

    expect(res.status).toBe(201);
    expect(res.body.team).toMatchObject({ id: expect.any(String), clubId: club.id, name: '1st XI', playerCount: 0 });
  });

  it('lets a coach create a team', async () => {
    const { club } = await signupClub();
    const coach = await memberToken(club.id, 'coach');
    const res = await request(app).post('/api/teams').set(bearer(coach)).send({ name: 'U15s' });
    expect(res.status).toBe(201);
  });

  it('ignores a clubId in the body and uses the token club', async () => {
    const a = await signupClub();
    const b = await signupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });
    const res = await request(app).post('/api/teams').set(bearer(a.token)).send({ name: '1st XI', clubId: b.club.id });

    expect(res.status).toBe(201);
    expect(res.body.team.clubId).toBe(a.club.id);
  });

  it('returns 409 for a name already used in the club, ignoring case', async () => {
    const { token } = await signupClub();
    await createTeam(token, '1st XI');
    const res = await request(app).post('/api/teams').set(bearer(token)).send({ name: '1ST xi' });

    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'CONFLICT', message: 'A team with this name already exists' });
  });

  it('allows the same name in another club', async () => {
    const a = await signupClub();
    const b = await signupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });
    await createTeam(a.token, '1st XI');
    const res = await request(app).post('/api/teams').set(bearer(b.token)).send({ name: '1st XI' });
    expect(res.status).toBe(201);
  });

  it.each([
    ['missing name', {}],
    ['empty name', { name: '   ' }],
    ['61-character name', { name: 'x'.repeat(61) }],
    ['non-string name', { name: 42 }],
  ])('returns 400 for %s', async (_label, body) => {
    const { token } = await signupClub();
    const res = await request(app).post('/api/teams').set(bearer(token)).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: 'name' })]);
    expect(await count('teams')).toBe(0);
  });
});

describe('GET /api/teams', () => {
  it('lists only the caller club teams, sorted by name, with player counts', async () => {
    const a = await signupClub();
    const b = await signupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });
    const second = await createTeam(a.token, 'b-team');
    await createTeam(a.token, 'A-team');
    await createTeam(b.token, 'Hilltop XI');
    const player = await createPlayer(a.token);
    await request(app).post(`/api/teams/${second.id}/players`).set(bearer(a.token)).send({ playerId: player.id });

    const playerToken = await memberToken(a.club.id, 'player');
    const res = await request(app).get('/api/teams').set(bearer(playerToken));

    expect(res.status).toBe(200);
    expect(res.body.teams.map((t: { name: string }) => t.name)).toEqual(['A-team', 'b-team']);
    expect(res.body.teams[1].playerCount).toBe(1);
  });
});

describe('GET /api/teams/:teamId', () => {
  it('returns the team with its roster and player details', async () => {
    const { token } = await signupClub();
    const team = await createTeam(token);
    const asha = await createPlayer(token, 'Asha Patel');
    const ben = await createPlayer(token, 'Ben Stokes');
    await request(app).post(`/api/teams/${team.id}/players`).set(bearer(token)).send({ playerId: asha.id, shirtNumber: 9 });
    await request(app)
      .post(`/api/teams/${team.id}/players`)
      .set(bearer(token))
      .send({ playerId: ben.id, isCaptain: true });

    const res = await request(app).get(`/api/teams/${team.id}`).set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.team).toMatchObject({ id: team.id, playerCount: 2 });
    expect(res.body.roster).toEqual([
      expect.objectContaining({ player: expect.objectContaining({ id: ben.id, fullName: 'Ben Stokes' }), isCaptain: true }),
      expect.objectContaining({ player: expect.objectContaining({ id: asha.id }), shirtNumber: 9, isCaptain: false }),
    ]);
  });

  it('returns 404 for an unknown team', async () => {
    const { token } = await signupClub();
    const res = await request(app).get(`/api/teams/${MISSING_ID}`).set(bearer(token));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Team not found' });
  });

  it('returns 404, not 500, for a non-UUID id', async () => {
    const { token } = await signupClub();
    const res = await request(app).get('/api/teams/not-a-uuid').set(bearer(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/teams/:teamId', () => {
  it('renames the team', async () => {
    const { token } = await signupClub();
    const team = await createTeam(token);
    const res = await request(app).patch(`/api/teams/${team.id}`).set(bearer(token)).send({ name: 'First XI' });

    expect(res.status).toBe(200);
    expect(res.body.team).toMatchObject({ id: team.id, name: 'First XI' });
  });

  it('returns 409 when renaming to a name taken in the club', async () => {
    const { token } = await signupClub();
    await createTeam(token, '1st XI');
    const team = await createTeam(token, '2nd XI');
    const res = await request(app).patch(`/api/teams/${team.id}`).set(bearer(token)).send({ name: '1st xi' });
    expect(res.status).toBe(409);
  });

  it('returns 400 for an invalid name', async () => {
    const { token } = await signupClub();
    const team = await createTeam(token);
    const res = await request(app).patch(`/api/teams/${team.id}`).set(bearer(token)).send({ name: '' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/teams/:teamId', () => {
  it('lets an admin delete a team and its roster entries', async () => {
    const { token } = await signupClub();
    const team = await createTeam(token);
    const player = await createPlayer(token);
    await request(app).post(`/api/teams/${team.id}/players`).set(bearer(token)).send({ playerId: player.id });

    const res = await request(app).delete(`/api/teams/${team.id}`).set(bearer(token));

    expect(res.status).toBe(204);
    expect(await count('teams')).toBe(0);
    expect(await count('team_players')).toBe(0);
    expect(await count('players')).toBe(1);
  });

  it('forbids a coach from deleting a team', async () => {
    const { token, club } = await signupClub();
    const team = await createTeam(token);
    const coach = await memberToken(club.id, 'coach');

    const res = await request(app).delete(`/api/teams/${team.id}`).set(bearer(coach));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await count('teams')).toBe(1);
  });

  it('returns 404 for an unknown team', async () => {
    const { token } = await signupClub();
    const res = await request(app).delete(`/api/teams/${MISSING_ID}`).set(bearer(token));
    expect(res.status).toBe(404);
  });
});

describe('players', () => {
  it('lets a coach create a player and anyone in the club list them', async () => {
    const { token, club } = await signupClub();
    const coach = await memberToken(club.id, 'coach');
    const created = await request(app).post('/api/players').set(bearer(coach)).send({ fullName: ' Zoe Ali ' });
    await createPlayer(token, 'asha Patel');

    expect(created.status).toBe(201);
    expect(created.body.player).toMatchObject({ clubId: club.id, fullName: 'Zoe Ali', userId: null });

    const player = await memberToken(club.id, 'player');
    const res = await request(app).get('/api/players').set(bearer(player));
    expect(res.status).toBe(200);
    expect(res.body.players.map((p: { fullName: string }) => p.fullName)).toEqual(['asha Patel', 'Zoe Ali']);
  });

  it('lists only the caller club players', async () => {
    const a = await signupClub();
    const b = await signupClub({ clubName: 'Hilltop CC', email: 'admin@hilltop.test' });
    await createPlayer(b.token, 'Hilltop Player');
    const res = await request(app).get('/api/players').set(bearer(a.token));
    expect(res.body.players).toEqual([]);
  });

  it.each([
    ['missing fullName', {}],
    ['101-character fullName', { fullName: 'x'.repeat(101) }],
  ])('returns 400 for %s', async (_label, body) => {
    const { token } = await signupClub();
    const res = await request(app).post('/api/players').set(bearer(token)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('roles', () => {
  it.each([
    ['POST', '/api/teams', { name: 'Nope' }],
    ['PATCH', '/api/teams/:teamId', { name: 'Nope' }],
    ['DELETE', '/api/teams/:teamId', undefined],
    ['POST', '/api/players', { fullName: 'Nope' }],
    ['POST', '/api/teams/:teamId/players', { playerId: ':playerId' }],
    ['PATCH', '/api/teams/:teamId/players/:playerId', { isCaptain: true }],
    ['DELETE', '/api/teams/:teamId/players/:playerId', undefined],
  ] as const)('a player gets 403 for %s %s and nothing changes', async (method, path, body) => {
    const { token, club } = await signupClub();
    const team = await createTeam(token);
    const player = await createPlayer(token);
    await request(app).post(`/api/teams/${team.id}/players`).set(bearer(token)).send({ playerId: player.id });
    const playerToken = await memberToken(club.id, 'player');

    const url = path.replace(':teamId', team.id).replace(':playerId', player.id);
    const json = body && JSON.parse(JSON.stringify(body).replace(':playerId', player.id));
    const res = await request(app)
      [method.toLowerCase() as 'post' | 'patch' | 'delete'](url)
      .set(bearer(playerToken))
      .send(json);

    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: 'FORBIDDEN', message: expect.any(String) });
    const after = await request(app).get(`/api/teams/${team.id}`).set(bearer(token));
    expect(after.body.team.name).toBe('1st XI');
    expect(after.body.roster).toEqual([expect.objectContaining({ isCaptain: false })]);
    expect(await count('teams')).toBe(1);
    expect(await count('players')).toBe(1);
  });
});

describe('authentication', () => {
  it.each([
    ['GET', '/api/teams'],
    ['POST', '/api/teams'],
    ['GET', `/api/teams/${MISSING_ID}`],
    ['PATCH', `/api/teams/${MISSING_ID}`],
    ['DELETE', `/api/teams/${MISSING_ID}`],
    ['GET', '/api/players'],
    ['POST', '/api/players'],
    ['POST', `/api/teams/${MISSING_ID}/players`],
    ['PATCH', `/api/teams/${MISSING_ID}/players/${MISSING_ID}`],
    ['DELETE', `/api/teams/${MISSING_ID}/players/${MISSING_ID}`],
  ] as const)('%s %s returns 401 without a token', async (method, url) => {
    const res = await request(app)[method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
