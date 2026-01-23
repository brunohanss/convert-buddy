export type DocLink = {
  label: string;
  href: string;
};

export const docsNavigation: Array<{ section: string; links: DocLink[] }> = [
  {
    section: 'Start Here',
    links: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'What Convert Buddy Is', href: '/docs/what-it-is' }
    ]
  },
  {
    section: 'Core Concepts',
    links: [
      { label: 'How Conversion Works', href: '/docs/concepts/how-conversion-works' },
      { label: 'Streaming First', href: '/docs/concepts/streaming-first' },
      { label: 'Format Detection', href: '/docs/concepts/format-detection' },
      { label: 'Transform Pipeline', href: '/docs/concepts/transform-pipeline' },
      { label: 'Performance Model', href: '/docs/concepts/performance-model' }
    ]
  },
  {
    section: 'Using Convert Buddy',
    links: [
      { label: 'Basic Conversion', href: '/docs/using/basic-conversion' },
      { label: 'Files & URLs', href: '/docs/using/files-and-urls' },
      { label: 'Streaming Large Inputs', href: '/docs/using/streaming-large-inputs' },
      { label: 'Progress & Cancellation', href: '/docs/using/progress-and-cancellation' },
      { label: 'Auto-Detection Workflows', href: '/docs/using/auto-detection' },
      { label: 'Browser vs Node', href: '/docs/using/browser-vs-node' }
    ]
  },
  {
    section: 'API Guide',
    links: [
      { label: 'Choosing the Right API', href: '/docs/api/choosing' },
      { label: 'Simple API', href: '/docs/api/simple' },
      { label: 'Instance API', href: '/docs/api/instance' },
      { label: 'Streaming API', href: '/docs/api/streaming' },
      { label: 'Browser Helpers', href: '/docs/api/browser-helpers' },
      { label: 'Node Helpers', href: '/docs/api/node-helpers' }
    ]
  },
  {
    section: 'Formats',
    links: [
      { label: 'CSV', href: '/docs/formats/csv' },
      { label: 'JSON', href: '/docs/formats/json' },
      { label: 'NDJSON', href: '/docs/formats/ndjson' },
      { label: 'XML', href: '/docs/formats/xml' }
    ]
  },
  {
    section: 'Detection',
    links: [
      { label: 'Detecting Format', href: '/docs/detection/detecting-format' },
      { label: 'Detecting Structure', href: '/docs/detection/detecting-structure' },
      { label: 'Detection Limits', href: '/docs/detection/detection-limits' }
    ]
  },
  {
    section: 'Performance',
    links: [
      { label: 'Telemetry & Stats', href: '/docs/performance/telemetry-and-stats' },
      { label: 'Memory Model', href: '/docs/performance/memory-model' },
      { label: 'Benchmarks', href: '/docs/performance/benchmarks' },
      { label: 'When Convert Buddy Is Slower', href: '/docs/performance/when-slower' }
    ]
  },
  {
    section: 'Recipes',
    links: [
      { label: 'Large Files', href: '/docs/recipes/large-files' },
      { label: 'Progress UI', href: '/docs/recipes/progress-ui' },
      { label: 'Cancellation', href: '/docs/recipes/cancellation' },
      { label: 'Auto-detect Pipelines', href: '/docs/recipes/auto-detect-pipelines' },
      { label: 'ETL Pipelines', href: '/docs/recipes/etl-pipelines' }
    ]
  },
  {
    section: 'Reference',
    links: [
      { label: 'Configuration', href: '/docs/reference/configuration' },
      { label: 'Transform', href: '/docs/reference/transform' },
      { label: 'Error Handling', href: '/docs/reference/error-handling' },
      { label: 'Stats Objects', href: '/docs/reference/stats-objects' }
    ]
  }
];
