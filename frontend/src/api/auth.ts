import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, token } from "./client";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(60),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers and underscores only"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  displayName: string;
  username: string;
  email: string;
  createdAt: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ─── API functions ────────────────────────────────────────────────────────────

type Wrap<T> = { data: T };

async function login(data: LoginInput): Promise<AuthResponse> {
  const res = await client.post<Wrap<AuthResponse>>("/auth/login", data);
  return res.data.data;
}

async function register(data: RegisterInput): Promise<AuthResponse> {
  const res = await client.post<Wrap<AuthResponse>>("/auth/register", data);
  return res.data.data;
}

async function googleLogin(idToken: string): Promise<AuthResponse> {
  const res = await client.post<Wrap<AuthResponse>>("/auth/social/google", { idToken });
  return res.data.data;
}

async function getMe(): Promise<User> {
  const res = await client.get<Wrap<{ user: User }>>("/auth/me");
  return res.data.data.user;
}

async function logout(): Promise<void> {
  await client.post("/auth/logout", { refreshToken: token.refresh });
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    enabled: !!token.access,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken, refreshToken, user }) => {
      token.set(accessToken, refreshToken);
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: register,
    onSuccess: ({ accessToken, refreshToken, user }) => {
      token.set(accessToken, refreshToken);
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: googleLogin,
    onSuccess: ({ accessToken, refreshToken, user }) => {
      token.set(accessToken, refreshToken);
      queryClient.setQueryData(["me"], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      token.clear();
      queryClient.clear();
      window.location.href = "/";
    },
  });
}
