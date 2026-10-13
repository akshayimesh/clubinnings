import type { RosterEntry, Team } from '../types/domain.js';
import { conflict, notFound } from '../types/errors.js';
import { uniqueViolation } from './pgErrors.js';
import { listRoster } from './roster.repository.js';
import * as teams from './team.repository.js';

const teamNotFound = () => notFound('Team not found');

export function listTeams(clubId: string): Promise<Team[]> {
  return teams.listTeams(clubId);
}

export async function getTeamWithRoster(clubId: string, teamId: string): Promise<{ team: Team; roster: RosterEntry[] }> {
  const [team, roster] = await Promise.all([teams.findTeam(teamId, clubId), listRoster(teamId, clubId)]);
  if (!team) throw teamNotFound();
  return { team, roster };
}

export async function createTeam(clubId: string, name: string): Promise<Team> {
  try {
    return await teams.createTeam(clubId, name);
  } catch (err) {
    throw mapTeamError(err);
  }
}

export async function renameTeam(clubId: string, teamId: string, name: string): Promise<Team> {
  let team: Team | null;
  try {
    team = await teams.renameTeam(teamId, clubId, name);
  } catch (err) {
    throw mapTeamError(err);
  }
  if (!team) throw teamNotFound();
  return team;
}

export async function deleteTeam(clubId: string, teamId: string): Promise<void> {
  if (!(await teams.deleteTeam(teamId, clubId))) throw teamNotFound();
}

function mapTeamError(err: unknown): unknown {
  return uniqueViolation(err) === 'teams_club_name_unique' ? conflict('A team with this name already exists') : err;
}
