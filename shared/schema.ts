import { z } from "zod";

export const addressSchema = z.object({
  address: z.string(),
  username: z.string().optional(),
  points: z.number().optional(),
  rank: z.number().optional(),
});

export const comparisonResultSchema = z.object({
  notMinted: z.array(addressSchema),
  stats: z.object({
    totalEligible: z.number(),
    totalMinted: z.number(),
    remaining: z.number(),
  }),
});

export type Address = z.infer<typeof addressSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
