import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-4xl font-semibold">404</p>
      <p className="text-sm text-muted-foreground">Page not found</p>
      <Button variant="outline" size="sm" render={<Link to="/" />}>
        Go home
      </Button>
    </div>
  );
}
