import { SectionHeading } from '@/components/ui/SectionHeading';

export default function LegalPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
      <SectionHeading
        eyebrow="Legal"
        title="Privacy and terms"
        subtitle="Convert Buddy processes data locally in your browser. Ads never access your files or conversion output."
      />
      <div className="mt-10 space-y-8 text-sm text-text-secondary">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Privacy</h2>
          <p>Your files stay on-device. Conversion output is generated locally and never transmitted.</p>
          <p>Anonymous usage metrics may be collected for performance analytics.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-text-primary">Terms</h2>
          <p>Convert Buddy is provided as-is without warranties. Use the engine responsibly.</p>
          <p>Ads appear on converter pages but never block conversion functionality.</p>
        </section>
      </div>
    </div>
  );
}
