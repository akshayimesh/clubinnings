import { apiRequest } from './client';

export interface Team {
  id: string;
  clubId: string;
  name: string;
  playerCount: number;
  createdAt: string;
}

export interface Player {
  id: string;
  clubId: string;
  userId: string | null;
  fullName: string;
  createdAt: string;
}

export interface RosterEntry {
  player: Player;
  shirtNumber: number | null;
  isCaptain: boolean;
  addedAt: string;
}

export interface AddRosterEntryInput {
  playerId: string;
  shirtNumber?: number;
  isCaptain?: boolean;
}

export interface UpdateRosterEntryInput {
  shirtNumber?: number | null;
  isCaptain?: boolean;
}

const teamUrl = (teamId: string) => `/api/teams/${encodeURIComponent(teamId)}`;
const entryUrl = (teamId: string, playerId: string) => `${teamUrl(teamId)}/players/${encodeURIComponent(playerId)}`;

export const teamsApi = {
  list: () => apiRequest<{ teams: Team[] }>('/api/teams'),
  create: (name: string) => apiRequest<{ team: Team }>('/api/teams', { method: 'POST', json: { name } }),
  get: (teamId: string) => apiRequest<{ team: Team; roster: RosterEntry[] }>(teamUrl(teamId)),
  rename: (teamId: string, name: string) =>
    apiRequest<{ team: Team }>(teamUrl(teamId), { method: 'PATCH', json: { name } }),
  remove: (teamId: string) => apiRequest<void>(teamUrl(teamId), { method: 'DELETE' }),
  addPlayer: (teamId: string, input: AddRosterEntryInput) =>
    apiRequest<{ entry: RosterEntry }>(`${teamUrl(teamId)}/players`, { method: 'POST', json: input }),
  updateEntry: (teamId: string, playerId: string, input: UpdateRosterEntryInput) =>
    apiRequest<{ entry: RosterEntry }>(entryUrl(teamId, playerId), { method: 'PATCH', json: input }),
  removePlayer: (teamId: string, playerId: string) =>
    apiRequest<void>(entryUrl(teamId, playerId), { method: 'DELETE' }),
};

export const playersApi = {
  list: () => apiRequest<{ players: Player[] }>('/api/players'),
  create: (fullName: string) => apiRequest<{ player: Player }>('/api/players', { method: 'POST', json: { fullName } }),
};
