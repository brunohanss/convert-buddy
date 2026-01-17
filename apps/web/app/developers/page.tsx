import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function DevelopersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <SectionHeading
        eyebrow="Developers"
        title="Convert Buddy"
        subtitle="A streaming data processing engine for JavaScript, powered by Rust + WebAssembly."
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Install</p>
            <pre className="overflow-x-auto rounded-lg bg-ink-900 p-4 text-sm text-ink-50">npm install convert-buddy-js</pre>
            <ul className="grid gap-3 text-sm text-ink-600">
              <li>Streaming parsing</li>
              <li>Format &amp; structure detection</li>
              <li>Inline transformation</li>
              <li>High-throughput conversion</li>
              <li>Browser + Node support</li>
              <li>Progress &amp; cancellation</li>
            </ul>
          </div>
        </Card>
        <Card>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Architecture</p>
            <ul className="space-y-2 text-sm text-ink-600">
              <li>Rust core for deterministic streaming.</li>
              <li>WASM bindings for browser and Node.</li>
              <li>Streaming memory model with visibility into telemetry.</li>
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button href="/docs" variant="secondary" size="sm">
                Documentation
              </Button>
              <Button href="/convert" variant="secondary" size="sm">
                Online converter
              </Button>
              <Button href="https://github.com" variant="ghost" size="sm">
                GitHub
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Minimal example</p>
            <pre className="overflow-x-auto rounded-lg bg-ink-900 p-4 text-sm text-ink-50">
              {`await convertToString(file, { outputFormat: "json" });`}
            </pre>
          </div>
        </Card>
        <Card>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Advanced example</p>
            <pre className="overflow-x-auto rounded-lg bg-ink-900 p-4 text-sm text-ink-50">
              {`const buddy = new ConvertBuddy({
  transform: (r) => ({ ...r, age_group: r.age > 50 ? "senior" : "adult" }),
  onProgress: (stats) => console.log(stats.throughputMbPerSec)
});`}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
