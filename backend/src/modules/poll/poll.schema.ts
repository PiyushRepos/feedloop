import { z } from 'zod';

// ─── Nested schemas ───────────────────────────────────────────────────────────

const optionSchema = z.object({
  text: z.string().min(1, 'Option text is required').max(300),
  order: z.number().int().min(0),
});

const questionSchema = z.object({
  text: z.string().min(1, 'Question text is required').max(500),
  isRequired: z.boolean().default(true),
  order: z.number().int().min(0),
  options: z
    .array(optionSchema)
    .min(2, 'Each question must have at least 2 options')
    .max(10, 'Each question can have at most 10 options'),
});

// ─── Poll schemas ─────────────────────────────────────────────────────────────

export const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  isAnonymous: z.boolean().default(false),
  requiresAuth: z.boolean().default(false),
  expiresAt: z.string().datetime({ message: 'Invalid expiry date' }).optional(),
  maxResponses: z
    .number()
    .int()
    .min(1, 'Max responses must be at least 1')
    .optional(),
  questions: z
    .array(questionSchema)
    .min(1, 'Poll must have at least one question')
    .max(20, 'Poll can have at most 20 questions'),
});

export const updatePollSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isAnonymous: z.boolean().optional(),
  requiresAuth: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  maxResponses: z.number().int().min(1).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'CLOSED', 'PUBLISHED']),
});

export const pollSlugSchema = z.object({
  slug: z.string().min(1),
});

export const pollIdSchema = z.object({
  id: z.string().uuid('Invalid poll ID'),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
