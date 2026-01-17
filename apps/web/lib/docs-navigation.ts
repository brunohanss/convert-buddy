export type DocLink = {
  label: string;
  href: string;
};

export const docsNavigation: Array<{ section: string; links: DocLink[] }> = [
  {
    section: 'Start here',
    links: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Getting Started', href: '/docs/getting-started' }
    ]
  },
  {
    section: 'Concepts',
    links: [
      { label: 'Streaming', href: '/docs/concepts/streaming' },
      { label: 'Detection', href: '/docs/concepts/detection' },
      { label: 'Transform', href: '/docs/concepts/transform' },
      { label: 'Performance Model', href: '/docs/concepts/performance-model' }
    ]
  },
  {
    section: 'API',
    links: [
      { label: 'Simple API', href: '/docs/api/simple' },
      { label: 'Instance API', href: '/docs/api/instance' },
      { label: 'Browser API', href: '/docs/api/browser' },
      { label: 'Node API', href: '/docs/api/node' },
      { label: 'Streaming API', href: '/docs/api/streaming' },
      { label: 'Transforms API', href: '/docs/api/transforms' }
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
      { label: 'Detect format', href: '/docs/detection/detect-format' },
      { label: 'Detect structure', href: '/docs/detection/detect-structure' }
    ]
  },
  {
    section: 'Performance',
    links: [
      { label: 'Telemetry', href: '/docs/performance/telemetry' },
      { label: 'Memory', href: '/docs/performance/memory' },
      { label: 'Benchmarks', href: '/docs/performance/benchmarks' }
    ]
  },
  {
    section: 'Recipes',
    links: [
      { label: 'Large files', href: '/docs/recipes/large-files' },
      { label: 'Progress UI', href: '/docs/recipes/progress-ui' },
      { label: 'Cancellation', href: '/docs/recipes/cancellation' },
      { label: 'Auto detect', href: '/docs/recipes/auto-detect' },
      { label: 'ETL pipelines', href: '/docs/recipes/etl-style-pipelines' }
    ]
  },
  {
    section: 'Reference',
    links: [{ label: 'FAQ', href: '/docs/faq' }]
  }
];
