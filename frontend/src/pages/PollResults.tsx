import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Users, Globe, Monitor, Cpu, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePollResults } from "@/api/analytics";
import { usePoll } from "@/api/polls";
import type { OptionResult, QuestionResult } from "@/api/analytics";
import { cn } from "@/lib/utils";

// ─── Option bar ───────────────────────────────────────────────────────────────

function OptionBar({ option, isTop }: { option: OptionResult; isTop: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", isTop && "text-foreground")}>
          {option.optionText}
        </span>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <span className="text-muted-foreground tabular-nums text-xs">
            {option.count} vote{option.count !== 1 ? "s" : ""}
          </span>
          <span className="tabular-nums font-medium w-10 text-right">
            {option.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isTop ? "bg-foreground" : "bg-muted-foreground/40",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${option.percentage}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
}: {
  question: QuestionResult;
  index: number;
}) {
  const sorted = [...question.options].sort((a, b) => b.count - a.count);
  const topCount = sorted[0]?.count ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
    >
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            {index + 1}. {question.questionText}
          </p>
          <div className="flex flex-col gap-3">
            {sorted.map((opt) => (
              <OptionBar
                key={opt.optionId}
                option={opt}
                isTop={opt.count === topCount && topCount > 0}
              />
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ─── Breakdown pill list ──────────────────────────────────────────────────────

function BreakdownList({
  items,
  total,
}: {
  items: { value: string; count: number }[];
  total: number;
}) {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((item) => (
        <div key={item.value} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="truncate text-sm">{item.value || "Unknown"}</span>
              <span className="text-muted-foreground text-xs tabular-nums ml-2 shrink-0">
                {total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-muted-foreground/50"
                initial={{ width: 0 }}
                animate={{ width: total > 0 ? `${(item.count / total) * 100}%` : "0%" }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-6 text-right shrink-0">
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PollResults() {
  const { slug } = useParams<{ slug: string }>();
  const { data: poll, isLoading: pollLoading } = usePoll(slug!);
  const { data: results, isLoading: resultsLoading, isError } = usePollResults(slug!);

  const isLoading = pollLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading results…</p>
      </div>
    );
  }

  if (isError || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Results not available.</p>
      </div>
    );
  }

  const hasBreakdowns =
    results.countries?.length ||
    results.deviceTypes?.length ||
    results.browsers?.length ||
    results.os?.length ||
    results.regions?.length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-8"
      >
        {/* Back + header */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 text-muted-foreground"
            render={<Link to={`/poll/${slug}`} />}
          >
            <ArrowLeft className="size-3.5" />
            Back to poll
          </Button>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Results</Badge>
              {poll?.status === "ACTIVE" && (
                <Badge variant="success">Live</Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold leading-snug">
              {poll?.title ?? "Poll Results"}
            </h1>
            {poll?.description && (
              <p className="text-muted-foreground text-sm">{poll.description}</p>
            )}
          </div>

          {/* Summary stat */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-4" />
            <span>
              <span className="font-medium text-foreground tabular-nums">
                {results.totalResponses}
              </span>{" "}
              total response{results.totalResponses !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Separator />

        {/* Questions */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Votes
          </h2>
          {results.questions.map((q, i) => (
            <QuestionCard key={q.questionId} question={q} index={i} />
          ))}
        </section>

        {/* Breakdowns */}
        {hasBreakdowns && (
          <>
            <Separator />
            <section className="flex flex-col gap-6">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Audience breakdown
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.countries && results.countries.length > 0 && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="size-3.5 text-muted-foreground" />
                        Countries
                      </div>
                      <BreakdownList
                        items={results.countries}
                        total={results.totalResponses}
                      />
                    </div>
                  </Card>
                )}

                {results.deviceTypes && results.deviceTypes.length > 0 && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Monitor className="size-3.5 text-muted-foreground" />
                        Devices
                      </div>
                      <BreakdownList
                        items={results.deviceTypes}
                        total={results.totalResponses}
                      />
                    </div>
                  </Card>
                )}

                {results.browsers && results.browsers.length > 0 && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Cpu className="size-3.5 text-muted-foreground" />
                        Browsers
                      </div>
                      <BreakdownList
                        items={results.browsers}
                        total={results.totalResponses}
                      />
                    </div>
                  </Card>
                )}

                {results.os && results.os.length > 0 && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Cpu className="size-3.5 text-muted-foreground" />
                        Operating Systems
                      </div>
                      <BreakdownList
                        items={results.os}
                        total={results.totalResponses}
                      />
                    </div>
                  </Card>
                )}

                {results.regions && results.regions.length > 0 && (
                  <Card className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Regions
                      </div>
                      <BreakdownList
                        items={results.regions}
                        total={results.totalResponses}
                      />
                    </div>
                  </Card>
                )}
              </div>
            </section>
          </>
        )}

        {/* No responses yet */}
        {results.totalResponses === 0 && (
          <Card className="py-12">
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-sm font-medium">No responses yet</p>
              <p className="text-xs text-muted-foreground">
                Share your poll to start collecting responses.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                render={<Link to={`/poll/${slug}`} />}
              >
                View poll
              </Button>
            </div>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
