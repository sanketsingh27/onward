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


export type StateInput = z.infer<typeof stateInputSchema>
export type EmbedInput = z.infer<typeof embedInputSchema>
