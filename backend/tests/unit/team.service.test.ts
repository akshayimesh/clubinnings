import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db/pool.js', () => ({ pool: {} }));
vi.mock('../../src/services/team.repository.js', () => ({
  listTeams: vi.fn(),
  findTeam: vi.fn(),
  createTeam: vi.fn(),
  renameTeam: vi.fn(),
  deleteTeam: vi.fn(),
}));
vi.mock('../../src/services/roster.repository.js', () => ({ listRoster: vi.fn() }));

const teamRepo = await import('../../src/services/team.repository.js');
const rosterRepo = await import('../../src/services/roster.repository.js');
const { createTeam, deleteTeam, getTeamWithRoster, renameTeam } = await import('../../src/services/team.service.js');

const team = { id: 'team-1', clubId: 'club-1', name: '1st XI', playerCount: 0, createdAt: new Date() };
const nameTaken = Object.assign(new Error('duplicate'), { code: '23505', constraint: 'teams_club_name_unique' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createTeam', () => {
  it('creates the team in the caller club', async () => {
    vi.mocked(teamRepo.createTeam).mockResolvedValue(team);
    await expect(createTeam('club-1', '1st XI')).resolves.toBe(team);
    expect(teamRepo.createTeam).toHaveBeenCalledWith('club-1', '1st XI');
  });

  it('maps a duplicate name to 409', async () => {
    vi.mocked(teamRepo.createTeam).mockRejectedValue(nameTaken);
    await expect(createTeam('club-1', '1st xi')).rejects.toMatchObject({
      status: 409,
      message: 'A team with this name already exists',
    });
  });

  it('rethrows other errors untouched', async () => {
    const boom = new Error('boom');
    vi.mocked(teamRepo.createTeam).mockRejectedValue(boom);
    await expect(createTeam('club-1', 'x')).rejects.toBe(boom);
  });
});

describe('renameTeam', () => {
  it('returns 404 when the team is not in the club', async () => {
    vi.mocked(teamRepo.renameTeam).mockResolvedValue(null);
    await expect(renameTeam('club-1', 'team-x', 'New')).rejects.toMatchObject({ status: 404 });
  });

  it('maps a duplicate name to 409', async () => {
    vi.mocked(teamRepo.renameTeam).mockRejectedValue(nameTaken);
    await expect(renameTeam('club-1', 'team-1', 'Taken')).rejects.toMatchObject({ status: 409 });
  });
});

describe('getTeamWithRoster', () => {
  it('returns the team and its roster', async () => {
    vi.mocked(teamRepo.findTeam).mockResolvedValue(team);
    vi.mocked(rosterRepo.listRoster).mockResolvedValue([]);
    await expect(getTeamWithRoster('club-1', 'team-1')).resolves.toEqual({ team, roster: [] });
    expect(teamRepo.findTeam).toHaveBeenCalledWith('team-1', 'club-1');
  });

  it('returns 404 when the team is not in the club', async () => {
    vi.mocked(teamRepo.findTeam).mockResolvedValue(null);
    vi.mocked(rosterRepo.listRoster).mockResolvedValue([]);
    await expect(getTeamWithRoster('club-1', 'team-x')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});

describe('deleteTeam', () => {
  it('returns 404 when nothing was deleted', async () => {
    vi.mocked(teamRepo.deleteTeam).mockResolvedValue(false);
    await expect(deleteTeam('club-1', 'team-x')).rejects.toMatchObject({ status: 404 });
  });
});
