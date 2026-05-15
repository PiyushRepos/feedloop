import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { GoogleLogin } from "@react-oauth/google";
import { Form } from "@/components/ui/form";
import { Field, FieldLabel, FieldError, FieldControl } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLogin, useGoogleLogin, loginSchema } from "@/api/auth";
import type { ZodError } from "zod";

type FieldErrors = Record<string, string[]>;

function parseZodErrors(err: ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as string;
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export default function Login() {
  const navigate = useNavigate();
  const { mutateAsync: login, isPending } = useLogin();
  const { mutateAsync: googleLogin } = useGoogleLogin();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const raw = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const result = loginSchema.safeParse(raw);
    if (!result.success) {
      setErrors(parseZodErrors(result.error));
      return;
    }

    try {
      await login(result.data);
      navigate("/dashboard");
    } catch {
      setServerError("Invalid email or password.");
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setServerError(null);
    try {
      await googleLogin(credential);
      navigate("/dashboard");
    } catch {
      setServerError("Google sign-in failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="block text-center text-sm font-semibold mb-8">
          feedloop
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-semibold">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to your account to continue.
          </p>
        </div>

        {/* Google */}
        <div className="flex justify-center">
          <GoogleLogin
            width={384}
            onSuccess={(res) => {
              if (res.credential) handleGoogleSuccess(res.credential);
            }}
            onError={() => setServerError("Google sign-in was cancelled.")}
          />
        </div>

        <div className="my-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-muted-foreground text-xs">or</span>
          <Separator className="flex-1" />
        </div>

        <Form
          errors={errors}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <Field name="email">
            <FieldLabel>Email</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              }
            />
            <FieldError />
          </Field>

          <Field name="password">
            <FieldLabel>Password</FieldLabel>
            <FieldControl
              render={
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              }
            />
            <FieldError />
          </Field>

          {serverError && (
            <p className="text-destructive-foreground text-xs">{serverError}</p>
          )}

          <Button type="submit" className="w-full mt-2" loading={isPending}>
            Sign in
          </Button>
        </Form>

        <p className="text-muted-foreground text-sm text-center mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-foreground font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
