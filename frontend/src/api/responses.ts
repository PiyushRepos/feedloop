import { useMutation } from "@tanstack/react-query";
import { client } from "./client";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const submitResponseSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid(),
      }),
    )
    .min(1),
});

export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;

export interface SubmitResponsePayload {
  slug: string;
  answers: SubmitResponseInput["answers"];
}

export interface ResponseResult {
  id: string;
  createdAt: string;
}

async function submitResponse(payload: SubmitResponsePayload): Promise<ResponseResult> {
  const res = await client.post<{ data: { response: ResponseResult } }>(
    `/polls/${payload.slug}/responses`,
    { answers: payload.answers },
  );
  return res.data.data.response;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSubmitResponse() {
  return useMutation({
    mutationFn: submitResponse,
  });
}
