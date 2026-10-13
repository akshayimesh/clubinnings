import type { Player } from '../types/domain.js';
import * as players from './player.repository.js';

export function listPlayers(clubId: string): Promise<Player[]> {
  return players.listPlayers(clubId);
}

export function createPlayer(clubId: string, fullName: string): Promise<Player> {
  return players.createPlayer(clubId, fullName);
}
