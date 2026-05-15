import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "./client";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const optionSchema = z.object({
  text: z.string().min(1, "Option text is required"),
});

export const questionSchema = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(optionSchema).min(2, "At least 2 options required"),
});

export const createPollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  questions: z.array(questionSchema).min(1, "At least one question required"),
  isAnonymous: z.boolean().default(false),
  statsVisibility: z.enum(["VOTES_ONLY", "BASIC", "FULL"]).default("VOTES_ONLY"),
  maxResponses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

export type PollStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "PUBLISHED";
export type StatsVisibility = "VOTES_ONLY" | "BASIC" | "FULL";

export interface PollOption {
  id: string;
  text: string;
  order: number;
}

export interface PollQuestion {
  id: string;
  text: string;
  order: number;
  options: PollOption[];
}

export interface Poll {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: PollStatus;
  isAnonymous: boolean;
  statsVisibility: StatsVisibility;
  maxResponses: number | null;
  expiresAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  questions: PollQuestion[];
  creator?: { id: string; username: string; displayName: string; avatarUrl: string | null };
  _count?: { responses: number };
}

export interface PollListItem {
  id: string;
  slug: string;
  title: string;
  status: PollStatus;
  createdAt: string;
  _count: { responses: number };
}

// ─── API functions ────────────────────────────────────────────────────────────

type Wrap<K extends string, T> = { data: Record<K, T> };

async function createPoll(data: CreatePollInput): Promise<Poll> {
  const res = await client.post<Wrap<"poll", Poll>>("/polls", data);
  return res.data.data.poll;
}

async function getMyPolls(): Promise<PollListItem[]> {
  const res = await client.get<Wrap<"polls", PollListItem[]>>("/polls/mine");
  return res.data.data.polls;
}

async function getPoll(slug: string): Promise<Poll> {
  const res = await client.get<Wrap<"poll", Poll>>(`/polls/${slug}`);
  return res.data.data.poll;
}

async function updatePoll(id: string, data: Partial<CreatePollInput>): Promise<Poll> {
  const res = await client.patch<Wrap<"poll", Poll>>(`/polls/${id}`, data);
  return res.data.data.poll;
}

async function deletePoll(id: string): Promise<void> {
  await client.delete(`/polls/${id}`);
}

async function setStatus(id: string, status: PollStatus): Promise<Poll> {
  const res = await client.patch<Wrap<"poll", Poll>>(`/polls/${id}/status`, { status });
  return res.data.data.poll;
}

function publishPoll(id: string) { return setStatus(id, "ACTIVE"); }
function closePoll(id: string)   { return setStatus(id, "CLOSED"); }

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useMyPolls() {
  return useQuery({
    queryKey: ["polls", "me"],
    queryFn: getMyPolls,
    enabled: !!localStorage.getItem("access_token"),
  });
}

export function usePoll(slug: string) {
  return useQuery({
    queryKey: ["polls", slug],
    queryFn: () => getPoll(slug),
    enabled: !!slug,
    staleTime: 0,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls", "me"] });
    },
  });
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updatePoll>[1] }) =>
      updatePoll(id, data),
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ["polls", "me"] });
      queryClient.setQueryData(["polls", poll.slug], poll);
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePoll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls", "me"] });
    },
  });
}

export function usePublishPoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishPoll,
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ["polls", "me"] });
      queryClient.setQueryData(["polls", poll.slug], poll);
    },
  });
}

export function useClosePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closePoll,
    onSuccess: (poll) => {
      queryClient.invalidateQueries({ queryKey: ["polls", "me"] });
      queryClient.setQueryData(["polls", poll.slug], poll);
    },
  });
}
