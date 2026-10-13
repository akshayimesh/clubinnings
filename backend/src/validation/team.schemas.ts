import { z } from 'zod';

const shirtNumber = z.number().int().min(0).max(999);

export const teamNameSchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const createPlayerSchema = z.object({
  fullName: z.string().trim().min(1).max(100),
});

export const addRosterEntrySchema = z.object({
  playerId: z.uuid(),
  shirtNumber: shirtNumber.optional(),
  isCaptain: z.boolean().optional(),
});

export const updateRosterEntrySchema = z
  .object({
    shirtNumber: shirtNumber.nullable().optional(),
    isCaptain: z.boolean().optional(),
  })
  .refine((v) => v.shirtNumber !== undefined || v.isCaptain !== undefined, {
    message: 'Provide shirtNumber or isCaptain',
  });

export type TeamNameInput = z.infer<typeof teamNameSchema>;
export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type AddRosterEntryInput = z.infer<typeof addRosterEntrySchema>;
export type UpdateRosterEntryInput = z.infer<typeof updateRosterEntrySchema>;
