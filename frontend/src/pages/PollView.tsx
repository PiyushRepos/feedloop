import { useParams } from "react-router";

export default function PollView() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Poll: {slug}</p>
    </div>
  );
}
