import { z } from 'zod';

const answerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  selectedOptionId: z.string().uuid('Invalid option ID'),
});

export const submitResponseSchema = z.object({
  answers: z.array(answerSchema).min(1, 'At least one answer is required'),
});

export const responseSlugSchema = z.object({
  slug: z.string().min(1),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
