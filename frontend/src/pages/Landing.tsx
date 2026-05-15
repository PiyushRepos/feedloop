import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, useInView } from "motion/react";
import {
  BarChart2,
  ChevronRight,
  Clock,
  Globe,
  Link2,
  Lock,
  Zap,
} from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router";

const features = [
  {
    icon: Zap,
    title: "Real-time results",
    description:
      "Responses appear the moment they're submitted. No refresh needed — your dashboard updates live via WebSocket.",
  },
  {
    icon: BarChart2,
    title: "Built-in analytics",
    description:
      "See vote counts, response trends over time, and breakdowns by device and location — all in one place.",
  },
  {
    icon: Globe,
    title: "Geo & device breakdown",
    description:
      "Understand your audience. See which countries, browsers, and devices your respondents are coming from.",
  },
  {
    icon: Lock,
    title: "Privacy controls",
    description:
      "Choose what analytics are visible to respondents — votes only, basic stats, or full geo and device data.",
  },
  {
    icon: Link2,
    title: "Share anywhere",
    description:
      "Every poll gets a short shareable link. Drop it in an email, Slack, or social — works on any device.",
  },
  {
    icon: Clock,
    title: "Auto-close",
    description:
      "Set a deadline or a max response count. Polls close automatically, and everyone is notified in real time.",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function InViewSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <main className="overflow-hidden">
      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(125% 125% at 50% 90%, #000000 40%, #072607 100%)",
          }}
        />
        <div className="relative py-32">
          <div className="relative z-10 mx-auto w-full max-w-5xl px-6">
            <InViewSection className="mx-auto max-w-md text-center">
              <motion.h1
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-balance font-sans text-4xl font-semibold sm:text-5xl"
              >
                Polls that close the loop.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-muted-foreground mt-4 text-balance"
              >
                Create polls in seconds, share them anywhere, and watch
                real-time responses come in — with built-in analytics and
                privacy controls.
              </motion.p>
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-6"
              >
                <Button
                  size="default"
                  className="pr-2"
                  render={<Link to="/poll/create" />}
                >
                  <span className="text-nowrap">Create a poll</span>
                  <ChevronRight className="opacity-50" />
                </Button>
              </motion.div>
            </InViewSection>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <InViewSection className="mx-auto max-w-md text-center">
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-balance font-sans text-2xl font-semibold sm:text-3xl"
            >
              Everything you need to run great polls
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-muted-foreground mt-3 text-balance text-sm"
            >
              From creation to analysis, feedloop handles the full lifecycle of
              your poll.
            </motion.p>
          </InViewSection>

          <InViewSection className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Card>
                  <CardHeader>
                    <div className="mb-2 w-fit rounded-lg border p-2">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            ))}
          </InViewSection>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <InViewSection className="text-center">
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-balance font-sans text-2xl font-semibold sm:text-3xl"
            >
              Ready to hear from your audience?
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-muted-foreground mx-auto mt-3 max-w-sm text-balance text-sm"
            >
              Create your first poll in under a minute. No account required to
              respond.
            </motion.p>
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mt-8 flex items-center justify-center gap-3"
            >
              <Button size="lg" render={<Link to="/poll/create" />}>
                Create a poll
              </Button>
              <Button
                variant="outline"
                size="lg"
                render={<Link to="/explore" />}
              >
                Browse polls
              </Button>
            </motion.div>
          </InViewSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xs">
              <Link to="/" className="text-sm font-semibold">
                feedloop
              </Link>
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                Simple, real-time polls with built-in analytics and privacy
                controls.
              </p>
            </div>

            <div className="flex gap-16 text-sm">
              <div className="flex flex-col gap-3">
                <p className="font-medium">Product</p>
                <Link
                  to="/explore"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Explore
                </Link>
                <Link
                  to="/poll/create"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Create poll
                </Link>
                <Link
                  to="/dashboard"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                <p className="font-medium">Account</p>
                <Link
                  to="/login"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t mt-10 pt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              © {new Date().getFullYear()} feedloop. All rights reserved.
            </p>
            <p className="text-muted-foreground text-xs">
              Built with ❤️ for teams who listen.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
