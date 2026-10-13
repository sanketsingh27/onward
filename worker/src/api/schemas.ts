import { z } from 'zod'

export const stateInputSchema = z.object({
  opening_id: z.string().trim().min(1),
  status: z.enum(['saved', 'applied', 'dismissed']),
})

export const embedInputSchema = z.object({ texts: z.array(z.string()).min(1) })

export const reasonInputSchema = z.object({
  resume: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
})

const profileFiltersSchema = z.object({
  remote: z.enum(['Remote only', 'Hybrid ok', 'Onsite ok']),
  locations: z.array(z.string().trim().min(1)).max(20),
  compFloorUsd: z.number().finite().nonnegative(),
  compFloorInr: z.number().finite().nonnegative(),
  employmentType: z.enum(['Full-time', 'Contract']),
  seniority: z.enum(['Mid', 'Senior', 'Senior+', 'Staff+']),
  excludeTerms: z.array(z.string().trim().min(1)).max(50),
})

export const profileInputSchema = z.object({
  resume: z.string().trim().min(1).max(100_000),
  filters: profileFiltersSchema,
})

export type ProfileInput = z.infer<typeof profileInputSchema>


export type StateInput = z.infer<typeof stateInputSchema>
export type EmbedInput = z.infer<typeof embedInputSchema>
