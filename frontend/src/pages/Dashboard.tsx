import { useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  Plus,
  MoreHorizontal,
  BarChart2,
  ExternalLink,
  Trash2,
  Radio,
  CircleOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuGroup,
} from "@/components/ui/menu";
import { useMyPolls, usePublishPoll, useClosePoll, useDeletePoll } from "@/api/polls";
import type { PollListItem, PollStatus } from "@/api/polls";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: PollStatus): {
  label: string;
  variant: "default" | "secondary" | "outline" | "success" | "warning";
} {
  switch (status) {
    case "ACTIVE":    return { label: "Live",      variant: "success" };
    case "DRAFT":     return { label: "Draft",     variant: "secondary" };
    case "CLOSED":    return { label: "Closed",    variant: "outline" };
    case "PUBLISHED": return { label: "Published", variant: "outline" };
    default:          return { label: status,      variant: "outline" };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days > 0)  return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0)  return `${mins}m ago`;
  return "Just now";
}

// ─── Poll row ─────────────────────────────────────────────────────────────────

function PollRow({ poll, index }: { poll: PollListItem; index: number }) {
  const { mutate: publish, isPending: isPublishing } = usePublishPoll();
  const { mutate: close,   isPending: isClosing }    = useClosePoll();
  const { mutate: remove,  isPending: isDeleting }   = useDeletePoll();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { label, variant } = statusConfig(poll.status);
  const isDraft  = poll.status === "DRAFT";
  const isActive = poll.status === "ACTIVE";

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.05 }}
      >
        <Card className="px-4 py-3">
          <div className="flex items-center gap-3 text-left">
          {/* Status + title */}
          <div className="flex-1 min-w-0 flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={variant}>{label}</Badge>
              <span className="text-xs text-muted-foreground">
                {timeAgo(poll.createdAt)}
              </span>
            </div>
            <p className="text-sm font-medium truncate w-full">{poll.title}</p>
          </div>

          {/* Response count */}
          <div className="shrink-0 text-right hidden sm:block">
            <p className="text-sm font-medium tabular-nums">
              {poll._count.responses}
            </p>
            <p className="text-xs text-muted-foreground">
              {poll._count.responses === 1 ? "response" : "responses"}
            </p>
          </div>

          {/* Quick actions */}
          <div className="shrink-0 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link to={`/poll/${poll.slug}`} />}
              className="text-muted-foreground"
              title="View poll"
            >
              <ExternalLink className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              render={<Link to={`/poll/${poll.slug}/results`} />}
              className="text-muted-foreground"
              title="View results"
            >
              <BarChart2 className="size-3.5" />
            </Button>

            {/* More menu */}
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    title="More actions"
                  />
                }
              >
                <MoreHorizontal className="size-3.5" />
              </MenuTrigger>
              <MenuPopup align="end" sideOffset={6}>
                <MenuGroup>
                  {isDraft && (
                    <MenuItem
                      onClick={() => publish(poll.id)}
                      disabled={isPublishing}
                    >
                      <Radio className="size-4" />
                      {isPublishing ? "Publishing…" : "Publish"}
                    </MenuItem>
                  )}
                  {isActive && (
                    <MenuItem
                      onClick={() => close(poll.id)}
                      disabled={isClosing}
                    >
                      <CircleOff className="size-4" />
                      {isClosing ? "Closing…" : "Close poll"}
                    </MenuItem>
                  )}
                  <MenuItem
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </MenuItem>
                </MenuGroup>
              </MenuPopup>
            </Menu>
          </div>
          </div>
        </Card>
      </motion.div>

      {/* Delete confirm overlay */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl flex flex-col gap-4"
          >
            <div>
              <p className="font-semibold">Delete poll?</p>
              <p className="text-muted-foreground text-sm mt-1">
                <span className="font-medium text-foreground">{poll.title}</span>{" "}
                and all its responses will be permanently deleted. This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={() =>
                  remove(poll.id, { onSuccess: () => setDeleteOpen(false) })
                }
              >
                Delete
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <Card className="px-4 py-3 flex items-center gap-4">
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-4 w-14 rounded" />
        <Skeleton className="h-4 w-52 rounded" />
      </div>
      <Skeleton className="h-8 w-14 hidden sm:block rounded" />
      <Skeleton className="h-7 w-20 rounded" />
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: polls, isLoading, isError } = useMyPolls();

  const active  = polls?.filter((p) => p.status === "ACTIVE") ?? [];
  const draft   = polls?.filter((p) => p.status === "DRAFT") ?? [];
  const closed  = polls?.filter(
    (p) => p.status === "CLOSED" || p.status === "PUBLISHED",
  ) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Your polls</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage, publish, and track your polls.
            </p>
          </div>
          <Button size="sm" render={<Link to="/poll/create" />}>
            <Plus className="size-3.5" />
            New poll
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        )}

        {/* Error */}
        {isError && (
          <p className="text-sm text-destructive-foreground">
            Failed to load polls. Please refresh.
          </p>
        )}

        {/* Empty */}
        {!isLoading && !isError && polls?.length === 0 && (
          <Card className="py-16">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm font-medium">No polls yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Create your first poll and start collecting feedback from your audience.
            </p>
            <Button size="sm" render={<Link to="/poll/create" />}>
              <Plus className="size-3.5" />
              Create poll
            </Button>
          </div>
          </Card>
        )}

        {/* Grouped sections */}
        {!isLoading && !isError && polls && polls.length > 0 && (
          <div className="flex flex-col gap-8">
            {active.length > 0 && (
              <Section label="Live" count={active.length}>
                {active.map((p, i) => (
                  <PollRow key={p.id} poll={p} index={i} />
                ))}
              </Section>
            )}

            {draft.length > 0 && (
              <Section label="Drafts" count={draft.length}>
                {draft.map((p, i) => (
                  <PollRow key={p.id} poll={p} index={i} />
                ))}
              </Section>
            )}

            {closed.length > 0 && (
              <Section label="Closed" count={closed.length}>
                {closed.map((p, i) => (
                  <PollRow key={p.id} poll={p} index={i} />
                ))}
              </Section>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h2>
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      {children}
    </section>
  );
}
