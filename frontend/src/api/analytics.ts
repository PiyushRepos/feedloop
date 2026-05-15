import { useQuery } from "@tanstack/react-query";
import { client } from "./client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OptionResult {
  optionId: string;
  optionText: string;
  count: number;
  percentage: number;
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  options: OptionResult[];
}

export interface PollResults {
  totalResponses: number;
  questions: QuestionResult[];
  // Only present when statsVisibility >= BASIC
  countries?: { value: string; count: number }[];
  deviceTypes?: { value: string; count: number }[];
  // Only present when statsVisibility === FULL
  browsers?: { value: string; count: number }[];
  os?: { value: string; count: number }[];
  regions?: { value: string; count: number }[];
  cities?: { value: string; count: number }[];
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface PollAnalytics extends PollResults {
  timeline: TimelinePoint[];
}

// ─── API functions ────────────────────────────────────────────────────────────

type ApiResponse<T> = { data: T };

async function getPollResults(slug: string): Promise<PollResults> {
  const res = await client.get<ApiResponse<PollResults>>(`/polls/${slug}/results`);
  return res.data.data;
}

async function getPollAnalytics(pollId: string): Promise<PollAnalytics> {
  const res = await client.get<ApiResponse<PollAnalytics>>(`/polls/${pollId}/analytics`);
  return res.data.data;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePollResults(slug: string) {
  return useQuery({
    queryKey: ["results", slug],
    queryFn: () => getPollResults(slug),
    enabled: !!slug,
  });
}

export function usePollAnalytics(pollId: string) {
  return useQuery({
    queryKey: ["analytics", pollId],
    queryFn: () => getPollAnalytics(pollId),
    enabled: !!pollId && !!localStorage.getItem("access_token"),
  });
}
