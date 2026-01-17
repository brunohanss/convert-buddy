import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Stat } from '@/components/ui/Stat';

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-400">Convert Buddy</p>
          <h1 className="text-4xl font-semibold leading-tight text-ink-900 md:text-5xl">
            Convert, Transform, and Inspect Data at Scale
          </h1>
          <p className="text-lg text-ink-600">
            High-performance streaming conversion for CSV, JSON, NDJSON, and XML — in your browser or your code.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/convert">Convert a file</Button>
            <Button href="/developers" variant="secondary">
              Use the library
            </Button>
          </div>
          <div className="grid gap-4 pt-6 sm:grid-cols-2">
            <Stat label="Runs locally" value="No uploads required" />
            <Stat label="Handles large files" value="Multi-GB streaming" />
            <Stat label="Low memory" value="Deterministic resource use" />
            <Stat label="Core" value="Rust + WebAssembly" />
          </div>
        </div>
        <Card>
          <div className="space-y-4">
            <SectionHeading
              eyebrow="Assurance"
              title="Deterministic processing, visible performance."
              subtitle="Convert Buddy keeps conversion and transformation in a controlled pipeline with live telemetry so you can trust every run."
            />
            <ul className="space-y-3 text-sm text-ink-600">
              <li>Streaming conversion and transformation pipelines.</li>
              <li>Detection and validation with overrideable configs.</li>
              <li>Performance metrics emitted every interval.</li>
              <li>Ads never interrupt functionality.</li>
            </ul>
          </div>
        </Card>
      </section>

      <section className="mt-20 grid gap-6 md:grid-cols-2">
        <Card>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">For data users</p>
            <h3 className="text-xl font-semibold text-ink-900">Convert files safely in your browser</h3>
            <p className="text-sm text-ink-600">
              Upload nothing. Stream everything. Convert Buddy keeps large files local while showing real-time throughput,
              memory usage, and outputs.
            </p>
            <Button href="/convert" variant="secondary" size="sm">
              Go to converter
            </Button>
          </div>
        </Card>
        <Card>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">For developers</p>
            <h3 className="text-xl font-semibold text-ink-900">Adopt the streaming engine</h3>
            <p className="text-sm text-ink-600">
              Ship Convert Buddy in browsers and Node. Integrate streaming conversion, detection, and transformation in
              minutes.
            </p>
            <Button href="/developers" variant="secondary" size="sm">
              View developer docs
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
