import { withTransaction } from '../db/pool.js';
import type { RosterEntry } from '../types/domain.js';
import { conflict, notFound } from '../types/errors.js';
import type { AddRosterEntryInput, UpdateRosterEntryInput } from '../validation/team.schemas.js';
import { isForeignKeyViolation, uniqueViolation } from './pgErrors.js';
import { findPlayer } from './player.repository.js';
import * as roster from './roster.repository.js';
import { findTeam } from './team.repository.js';

/** Adds a club player to a club team. Making them captain replaces the current captain atomically. */
export async function addPlayer(clubId: string, teamId: string, input: AddRosterEntryInput): Promise<RosterEntry> {
  try {
    return await withTransaction(async (tx) => {
      // Sequential: a pg client runs one query at a time.
      if (!(await findTeam(teamId, clubId, tx))) throw notFound('Team not found');
      if (!(await findPlayer(input.playerId, clubId, tx))) throw notFound('Player not found');

      const isCaptain = input.isCaptain ?? false;
      if (isCaptain) await roster.clearCaptain(tx, teamId, clubId);
      return roster.insertEntry(tx, {
        teamId,
        playerId: input.playerId,
        clubId,
        shirtNumber: input.shirtNumber ?? null,
        isCaptain,
      });
    });
  } catch (err) {
    throw mapRosterError(err, input.shirtNumber);
  }
}

export async function updateEntry(
  clubId: string,
  teamId: string,
  playerId: string,
  patch: UpdateRosterEntryInput,
): Promise<RosterEntry> {
  try {
    return await withTransaction(async (tx) => {
      if (patch.isCaptain) await roster.clearCaptain(tx, teamId, clubId);
      const entry = await roster.updateEntry(tx, { teamId, playerId, clubId }, patch);
      // Throwing rolls back the captain change above.
      if (!entry) throw notFound('Player is not on this team');
      return entry;
    });
  } catch (err) {
    throw mapRosterError(err, patch.shirtNumber);
  }
}

export async function removePlayer(clubId: string, teamId: string, playerId: string): Promise<void> {
  if (!(await roster.deleteEntry(teamId, playerId, clubId))) throw notFound('Player is not on this team');
}

function mapRosterError(err: unknown, shirtNumber: number | null | undefined): unknown {
  const constraint = uniqueViolation(err);
  if (constraint === 'team_players_pkey') return conflict('Player is already on this team');
  if (constraint === 'team_players_shirt_unique') {
    return conflict(`Shirt number ${shirtNumber} is already taken on this team`);
  }
  // The team or player was deleted between our check and the insert.
  if (isForeignKeyViolation(err)) return notFound('Team or player not found');
  return err;
}
