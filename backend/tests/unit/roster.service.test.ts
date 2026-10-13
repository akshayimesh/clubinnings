import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = vi.hoisted(() => ({ tx: true }));
vi.mock('../../src/db/pool.js', () => ({
  pool: {},
  withTransaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tx)),
}));
vi.mock('../../src/services/team.repository.js', () => ({ findTeam: vi.fn() }));
vi.mock('../../src/services/player.repository.js', () => ({ findPlayer: vi.fn() }));
vi.mock('../../src/services/roster.repository.js', () => ({
  insertEntry: vi.fn(),
  updateEntry: vi.fn(),
  clearCaptain: vi.fn(),
  deleteEntry: vi.fn(),
}));

const teamRepo = await import('../../src/services/team.repository.js');
const playerRepo = await import('../../src/services/player.repository.js');
const rosterRepo = await import('../../src/services/roster.repository.js');
const { addPlayer, removePlayer, updateEntry } = await import('../../src/services/roster.service.js');

const team = { id: 'team-1', clubId: 'club-1', name: '1st XI', playerCount: 0, createdAt: new Date() };
const player = { id: 'player-1', clubId: 'club-1', userId: null, fullName: 'Asha Patel', createdAt: new Date() };
const entry = { player, shirtNumber: 7, isCaptain: true, addedAt: new Date() };
const pgUnique = (constraint: string) => Object.assign(new Error('duplicate'), { code: '23505', constraint });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(teamRepo.findTeam).mockResolvedValue(team);
  vi.mocked(playerRepo.findPlayer).mockResolvedValue(player);
  vi.mocked(rosterRepo.insertEntry).mockResolvedValue(entry);
  vi.mocked(rosterRepo.updateEntry).mockResolvedValue(entry);
});

describe('addPlayer', () => {
  it('looks up the team and player in the caller club and inserts the entry', async () => {
    await expect(addPlayer('club-1', 'team-1', { playerId: 'player-1', shirtNumber: 7 })).resolves.toBe(entry);

    expect(teamRepo.findTeam).toHaveBeenCalledWith('team-1', 'club-1', tx);
    expect(playerRepo.findPlayer).toHaveBeenCalledWith('player-1', 'club-1', tx);
    expect(rosterRepo.clearCaptain).not.toHaveBeenCalled();
    expect(rosterRepo.insertEntry).toHaveBeenCalledWith(tx, {
      teamId: 'team-1',
      playerId: 'player-1',
      clubId: 'club-1',
      shirtNumber: 7,
      isCaptain: false,
    });
  });

  it('clears the current captain before inserting a new captain', async () => {
    await addPlayer('club-1', 'team-1', { playerId: 'player-1', isCaptain: true });

    expect(rosterRepo.clearCaptain).toHaveBeenCalledWith(tx, 'team-1', 'club-1');
    const clearOrder = vi.mocked(rosterRepo.clearCaptain).mock.invocationCallOrder[0]!;
    const insertOrder = vi.mocked(rosterRepo.insertEntry).mock.invocationCallOrder[0]!;
    expect(clearOrder).toBeLessThan(insertOrder);
  });

  it('returns 404 when the team is not in the club', async () => {
    vi.mocked(teamRepo.findTeam).mockResolvedValue(null);
    await expect(addPlayer('club-1', 'team-x', { playerId: 'player-1' })).rejects.toMatchObject({
      status: 404,
      message: 'Team not found',
    });
    expect(rosterRepo.insertEntry).not.toHaveBeenCalled();
  });

  it('returns 404 when the player is not in the club', async () => {
    vi.mocked(playerRepo.findPlayer).mockResolvedValue(null);
    await expect(addPlayer('club-1', 'team-1', { playerId: 'player-x' })).rejects.toMatchObject({
      status: 404,
      message: 'Player not found',
    });
    expect(rosterRepo.insertEntry).not.toHaveBeenCalled();
  });

  it('maps a duplicate roster entry to 409', async () => {
    vi.mocked(rosterRepo.insertEntry).mockRejectedValue(pgUnique('team_players_pkey'));
    await expect(addPlayer('club-1', 'team-1', { playerId: 'player-1' })).rejects.toMatchObject({
      status: 409,
      message: 'Player is already on this team',
    });
  });

  it('maps a taken shirt number to 409 naming the number', async () => {
    vi.mocked(rosterRepo.insertEntry).mockRejectedValue(pgUnique('team_players_shirt_unique'));
    await expect(addPlayer('club-1', 'team-1', { playerId: 'player-1', shirtNumber: 7 })).rejects.toMatchObject({
      status: 409,
      message: 'Shirt number 7 is already taken on this team',
    });
  });

  it('maps a foreign key race to 404', async () => {
    vi.mocked(rosterRepo.insertEntry).mockRejectedValue(Object.assign(new Error('fk'), { code: '23503' }));
    await expect(addPlayer('club-1', 'team-1', { playerId: 'player-1' })).rejects.toMatchObject({ status: 404 });
  });
});

describe('updateEntry', () => {
  it('clears the current captain before making a player captain', async () => {
    await updateEntry('club-1', 'team-1', 'player-1', { isCaptain: true });

    expect(rosterRepo.clearCaptain).toHaveBeenCalledWith(tx, 'team-1', 'club-1');
    expect(rosterRepo.updateEntry).toHaveBeenCalledWith(
      tx,
      { teamId: 'team-1', playerId: 'player-1', clubId: 'club-1' },
      { isCaptain: true },
    );
    const clearOrder = vi.mocked(rosterRepo.clearCaptain).mock.invocationCallOrder[0]!;
    const updateOrder = vi.mocked(rosterRepo.updateEntry).mock.invocationCallOrder[0]!;
    expect(clearOrder).toBeLessThan(updateOrder);
  });

  it('does not touch the captain when only the shirt number changes', async () => {
    await updateEntry('club-1', 'team-1', 'player-1', { shirtNumber: null });
    expect(rosterRepo.clearCaptain).not.toHaveBeenCalled();
  });

  it('returns 404 when the player is not on the team', async () => {
    vi.mocked(rosterRepo.updateEntry).mockResolvedValue(null);
    await expect(updateEntry('club-1', 'team-1', 'player-x', { isCaptain: true })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('maps a taken shirt number to 409', async () => {
    vi.mocked(rosterRepo.updateEntry).mockRejectedValue(pgUnique('team_players_shirt_unique'));
    await expect(updateEntry('club-1', 'team-1', 'player-1', { shirtNumber: 10 })).rejects.toMatchObject({
      status: 409,
      message: 'Shirt number 10 is already taken on this team',
    });
  });
});

describe('removePlayer', () => {
  it('returns 404 when the player is not on the team', async () => {
    vi.mocked(rosterRepo.deleteEntry).mockResolvedValue(false);
    await expect(removePlayer('club-1', 'team-1', 'player-x')).rejects.toMatchObject({ status: 404 });
  });

  it('deletes within the caller club', async () => {
    vi.mocked(rosterRepo.deleteEntry).mockResolvedValue(true);
    await removePlayer('club-1', 'team-1', 'player-1');
    expect(rosterRepo.deleteEntry).toHaveBeenCalledWith('team-1', 'player-1', 'club-1');
  });
});
