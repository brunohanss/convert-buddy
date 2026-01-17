export type ConversionConfig = {
  slug: string;
  label: string;
  input: string;
  output: string;
  description: string;
};

export const conversions: ConversionConfig[] = [
  {
    slug: 'csv-to-json',
    label: 'CSV to JSON',
    input: 'CSV',
    output: 'JSON',
    description: 'Stream rows from CSV into a structured JSON array or stream.'
  },
  {
    slug: 'json-to-csv',
    label: 'JSON to CSV',
    input: 'JSON',
    output: 'CSV',
    description: 'Flatten JSON records into CSV for spreadsheets and databases.'
  },
  {
    slug: 'xml-to-json',
    label: 'XML to JSON',
    input: 'XML',
    output: 'JSON',
    description: 'Extract XML records into normalized JSON output.'
  },
  {
    slug: 'ndjson-to-json',
    label: 'NDJSON to JSON',
    input: 'NDJSON',
    output: 'JSON',
    description: 'Merge NDJSON streams into JSON arrays or chunked output.'
  }
];
