import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreatePoll, usePublishPoll } from "@/api/polls";
import type { StatsVisibility } from "@/api/polls";

// ─── Local types ──────────────────────────────────────────────────────────────

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

function uid() {
  return crypto.randomUUID();
}

function makeQuestion(): Question {
  return {
    id: uid(),
    text: "",
    options: [
      { id: uid(), text: "" },
      { id: uid(), text: "" },
    ],
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatePoll() {
  const navigate = useNavigate();
  const { mutateAsync: createPoll, isPending: isCreating } = useCreatePoll();
  const { mutateAsync: publishPoll, isPending: isPublishing } = usePublishPoll();

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<"draft" | "publish" | null>(null);
  const [title, setTitle] = useState("Which feature should we build next?");
  const [description, setDescription] = useState("Help us prioritize our roadmap by voting for the feature you need most.");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uid(),
      text: "Which feature should we prioritize?",
      options: [
        { id: uid(), text: "Dark mode" },
        { id: uid(), text: "Mobile app" },
        { id: uid(), text: "API access" },
        { id: uid(), text: "Team collaboration" },
      ],
    },
    {
      id: uid(),
      text: "How often do you use our product?",
      options: [
        { id: uid(), text: "Daily" },
        { id: uid(), text: "Weekly" },
        { id: uid(), text: "Monthly" },
        { id: uid(), text: "Rarely" },
      ],
    },
  ]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [statsVisibility, setStatsVisibility] = useState<StatsVisibility>("BASIC");
  const [maxResponses, setMaxResponses] = useState("100");
  const [expiresAt, setExpiresAt] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Question helpers ────────────────────────────────────────────────────────

  function updateQuestion(id: string, text: string) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, text } : q)),
    );
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, makeQuestion()]);
  }

  function updateOption(qId: string, oId: string, text: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId
          ? { ...q, options: q.options.map((o) => (o.id === oId ? { ...o, text } : o)) }
          : q,
      ),
    );
  }

  function addOption(qId: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId ? { ...q, options: [...q.options, { id: uid(), text: "" }] } : q,
      ),
    );
  }

  function removeOption(qId: string, oId: string) {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== oId) } : q,
      ),
    );
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate() {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Title is required.";
    if (questions.length === 0) errs.questions = "Add at least one question.";
    questions.forEach((q, qi) => {
      if (!q.text.trim()) errs[`q-${qi}`] = "Question text is required.";
      if (q.options.length < 2) errs[`q-${qi}-opts`] = "At least 2 options required.";
      q.options.forEach((o, oi) => {
        if (!o.text.trim()) errs[`q-${qi}-o-${oi}`] = "Option text is required.";
      });
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildPayload() {
    return {
      title: title.trim(),
      description: description.trim() || undefined,
      questions: questions.map((q, qi) => ({
        text: q.text.trim(),
        order: qi,
        isRequired: true,
        options: q.options.map((o, oi) => ({ text: o.text.trim(), order: oi })),
      })),
      isAnonymous,
      statsVisibility,
      maxResponses: maxResponses ? parseInt(maxResponses, 10) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
    };
  }

  // ── Submit handlers ─────────────────────────────────────────────────────────

  async function handleSaveDraft() {
    if (!validate()) return;
    setSubmitError(null);
    setActiveAction("draft");
    try {
      await createPoll(buildPayload());
      navigate(`/dashboard`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? "Failed to save draft. Please try again.");
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePublish() {
    if (!validate()) return;
    setSubmitError(null);
    setActiveAction("publish");
    try {
      const poll = await createPoll(buildPayload());
      await publishPoll(poll.id);
      navigate(`/poll/${poll.slug}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? "Failed to publish poll. Please try again.");
    } finally {
      setActiveAction(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-10"
      >
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Create a poll</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Add questions and configure your poll before publishing.
          </p>
        </div>

        {/* Basic info */}
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium">Basic info</h2>
          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              type="text"
              placeholder="e.g. Which feature should we build next?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && (
              <p className="text-destructive-foreground text-xs">{errors.title}</p>
            )}
          </Field>
          <Field>
            <FieldLabel>
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </FieldLabel>
            <Input
              type="text"
              placeholder="Give respondents a bit more context"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </section>

        <Separator />

        {/* Questions */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Questions</h2>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Plus className="size-3.5" />
              Add question
            </Button>
          </div>

          {errors.questions && (
            <p className="text-destructive-foreground text-xs">{errors.questions}</p>
          )}

          <div className="flex flex-col gap-4">
            {questions.map((q, qi) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Card className="p-4 gap-4 flex flex-col">
                  {/* Question header */}
                  <div className="flex items-start gap-2">
                    <GripVertical className="size-4 text-muted-foreground mt-2 shrink-0" />
                    <div className="flex-1 flex flex-col gap-1">
                      <Input
                        type="text"
                        placeholder={`Question ${qi + 1}`}
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, e.target.value)}
                      />
                      {errors[`q-${qi}`] && (
                        <p className="text-destructive-foreground text-xs">
                          {errors[`q-${qi}`]}
                        </p>
                      )}
                    </div>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeQuestion(q.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive-foreground mt-0.5"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-2 pl-6">
                    {q.options.map((o, oi) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <div className="size-2 rounded-full border border-muted-foreground/40 shrink-0" />
                        <div className="flex-1">
                          <Input
                            type="text"
                            size="sm"
                            placeholder={`Option ${oi + 1}`}
                            value={o.text}
                            onChange={(e) => updateOption(q.id, o.id, e.target.value)}
                          />
                          {errors[`q-${qi}-o-${oi}`] && (
                            <p className="text-destructive-foreground text-xs mt-0.5">
                              {errors[`q-${qi}-o-${oi}`]}
                            </p>
                          )}
                        </div>
                        {q.options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeOption(q.id, o.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive-foreground"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        )}
                      </div>
                    ))}

                    {errors[`q-${qi}-opts`] && (
                      <p className="text-destructive-foreground text-xs">
                        {errors[`q-${qi}-opts`]}
                      </p>
                    )}

                    <Button
                      variant="ghost"
                      size="xs"
                      className="w-fit text-muted-foreground"
                      onClick={() => addOption(q.id)}
                    >
                      <Plus className="size-3" />
                      Add option
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Settings */}
        <section className="flex flex-col gap-5">
          <h2 className="text-sm font-medium">Settings</h2>

          {/* Anonymous */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Anonymous responses</Label>
              <p className="text-muted-foreground text-xs mt-0.5">
                Respondents won't need an account to answer.
              </p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          {/* Stats visibility */}
          <Field>
            <FieldLabel>Results visibility</FieldLabel>
            <FieldDescription>
              Control how much analytics respondents can see after voting.
            </FieldDescription>
            <Select value={statsVisibility} onValueChange={(v) => setStatsVisibility(v as StatsVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="VOTES_ONLY">Votes only</SelectItem>
                <SelectItem value="BASIC">Basic (+ country & device)</SelectItem>
                <SelectItem value="FULL">Full (+ browser, OS, region)</SelectItem>
              </SelectPopup>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            {/* Max responses */}
            <Field>
              <FieldLabel>
                Max responses{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <Input
                type="number"
                min={1}
                placeholder="Unlimited"
                value={maxResponses}
                onChange={(e) => setMaxResponses(e.target.value)}
              />
            </Field>

            {/* Expires at */}
            <Field>
              <FieldLabel>
                Close at{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </FieldLabel>
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </Field>
          </div>
        </section>

        <Separator />

        {/* Actions */}
        {submitError && (
          <p className="text-destructive-foreground text-xs text-right">{submitError}</p>
        )}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            loading={activeAction === "draft"}
            disabled={activeAction !== null}
            onClick={handleSaveDraft}
          >
            Save as draft
          </Button>
          <Button
            loading={activeAction === "publish"}
            disabled={activeAction !== null}
            onClick={handlePublish}
          >
            Publish poll
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
