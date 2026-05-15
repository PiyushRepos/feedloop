import { useState } from "react";
import { useParams, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Users, Clock, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/api/polls";
import { useSubmitResponse } from "@/api/responses";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    ACTIVE:    { label: "Live",     variant: "default" },
    DRAFT:     { label: "Draft",    variant: "secondary" },
    CLOSED:    { label: "Closed",   variant: "outline" },
    PUBLISHED: { label: "Published",variant: "outline" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── Submitted view ───────────────────────────────────────────────────────────

function SubmittedView({ slug }: { slug: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <CheckCircle2 className="size-7 text-foreground" />
      </div>
      <div>
        <p className="font-semibold text-lg">Thanks for your response!</p>
        <p className="text-muted-foreground text-sm mt-1">
          Your answer has been recorded.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link to={`/poll/${slug}/results`} />}>
        View results
      </Button>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PollView() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { data: poll, isLoading, isError } = usePoll(slug!);
  const { mutateAsync: submit, isPending } = useSubmitResponse();

  // questionId → selectedOptionId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading poll…</p>
      </div>
    );
  }

  if (isError || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Poll not found.</p>
      </div>
    );
  }

  const isOwner = user?.id === poll.creator?.id;
  const canRespond = poll.status === "ACTIVE";
  const isClosed = poll.status === "CLOSED" || poll.status === "PUBLISHED";

  function select(questionId: string, optionId: string) {
    setSelections((s) => ({ ...s, [questionId]: optionId }));
    setError(null);
  }

  async function handleSubmit() {
    const unanswered = poll!.questions.find((q) => !selections[q.id]);
    if (unanswered) {
      setError("Please answer all questions before submitting.");
      return;
    }

    const answers = Object.entries(selections).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    try {
      await submit({ slug: slug!, answers });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <AnimatePresence mode="wait">
        {submitted ? (
          <SubmittedView key="submitted" slug={slug!} />
        ) : (
          <motion.div
            key="poll"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col gap-8"
          >
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <StatusBadge status={poll.status} />
                {poll.isAnonymous && (
                  <Badge variant="secondary">Anonymous</Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold leading-snug">{poll.title}</h1>
              {poll.description && (
                <p className="text-muted-foreground text-sm">{poll.description}</p>
              )}
              <div className="flex items-center gap-4 text-muted-foreground text-xs">
                {poll._count !== undefined && (
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {poll._count.responses} response{poll._count.responses !== 1 ? "s" : ""}
                  </span>
                )}
                {poll.expiresAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Closes {new Date(poll.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Closed state */}
            {isClosed && !isOwner && (
              <Card className="flex items-center gap-3 p-4">
                <Lock className="size-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">
                  This poll is closed. No more responses are being accepted.
                </p>
              </Card>
            )}

            {/* Questions */}
            {(canRespond || isOwner) && (
              <div className="flex flex-col gap-6">
                {(poll.questions ?? [])
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((question, qi) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: qi * 0.06 }}
                      className="flex flex-col gap-3"
                    >
                      <p className="text-sm font-medium">
                        {qi + 1}. {question.text}
                      </p>
                      <div className="flex flex-col gap-2">
                        {question.options
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((option) => {
                            const selected = selections[question.id] === option.id;
                            return (
                              <button
                                key={option.id}
                                onClick={() => canRespond && select(question.id, option.id)}
                                disabled={!canRespond}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150",
                                  selected
                                    ? "border-foreground bg-foreground/5"
                                    : "border-border hover:border-foreground/30 hover:bg-muted/50",
                                  !canRespond && "cursor-default opacity-60",
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    selected
                                      ? "border-foreground bg-foreground"
                                      : "border-muted-foreground/40",
                                  )}
                                >
                                  {selected && (
                                    <span className="size-1.5 rounded-full bg-background" />
                                  )}
                                </span>
                                {option.text}
                              </button>
                            );
                          })}
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}

            {/* Error + submit */}
            {canRespond && (
              <div className="flex flex-col gap-3">
                {error && (
                  <p className="text-destructive-foreground text-xs">{error}</p>
                )}
                <Button
                  className="w-full"
                  loading={isPending}
                  onClick={handleSubmit}
                >
                  Submit response
                </Button>
                {poll.isAnonymous && (
                  <p className="text-center text-muted-foreground text-xs">
                    Your response is anonymous.
                  </p>
                )}
              </div>
            )}

            {/* Owner preview notice */}
            {isOwner && poll.status === "DRAFT" && (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  This is a preview — your poll is still a draft and not accepting responses.
                </p>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
