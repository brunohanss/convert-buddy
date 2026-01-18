import { DetectionWidget } from '@/components/converter/DetectionWidget';
import { SectionHeading } from '@/components/ui/SectionHeading';

export default function DetectPage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
      <SectionHeading
        eyebrow="Detection"
        title="Inspect format and structure"
        subtitle="Detect input format, structure, and schema before you convert. Output stays local and deterministic."
      />
      <div className="mt-10">
        <DetectionWidget />
      </div>
    </div>
  );
}
