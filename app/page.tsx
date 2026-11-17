import ToolGrid from "@/components/ToolGrid";
import { tools } from "@/lib/tools";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Tools</h1>
        <p className="muted">Small utilities I use, in one place. Free, no sign-up.</p>
      </section>
      <ToolGrid tools={tools} />
    </>
  );
}
