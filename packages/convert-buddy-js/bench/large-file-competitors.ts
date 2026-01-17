import { performance } from "node:perf_hooks";
import { convert } from "../index.js";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as fs from "node:fs";
import * as path from "node:path";

type BenchmarkResult = {
  tool: string;
  conversion: string;
  dataset: string;
  throughputMbps: number;
  latencyMs: number;
  memoryMb: number;
  recordsPerSec: number;
  success: boolean;
  error?: string;
};

type DatasetBundle = {
  records: Record<string, any>[];
  recordCount: number;
  ndjson: string;
  json: string;
  csv: string;
  xml: string;
};

const TARGET_BYTES = 100 * 1024 * 1024;

function buildLargeDatasets(targetBytes: number): DatasetBundle {
  const payload = "x".repeat(512);
  const records: Record<string, any>[] = [];
  const ndjsonLines: string[] = [];
  const csvLines: string[] = [];
  const xmlLines: string[] = [];
  let totalBytes = 0;
  let i = 0;

  while (totalBytes < targetBytes) {
    const record = {
      id: i,
      name: `name_${i}`,
      active: i % 2 === 0,
      score: i * 1.11,
      payload,
    };
    const ndjsonLine = JSON.stringify(record);
    ndjsonLines.push(ndjsonLine);
    records.push(record);
    csvLines.push(`${record.id},${record.name},${record.active},${record.score},"${record.payload}"`);
    xmlLines.push(
      `  <record><id>${record.id}</id><name>${record.name}</name><active>${record.active}</active><score>${record.score}</score><payload>${record.payload}</payload></record>`
    );

    totalBytes += Buffer.byteLength(ndjsonLine) + 1;
    i += 1;
  }

  const ndjson = `${ndjsonLines.join("\n")}\n`;
  const csv = `id,name,active,score,payload\n${csvLines.join("\n")}\n`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${xmlLines.join("\n")}\n</root>\n`;
  const json = JSON.stringify(records);

  return {
    records,
    recordCount: records.length,
    ndjson,
    json,
    csv,
    xml,
  };
}

async function runBenchmark(
  tool: string,
  conversion: string,
  inputBytes: number,
  recordCount: number,
  fn: () => Promise<void> | void
): Promise<BenchmarkResult> {
  try {
    if (global.gc) global.gc();

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    await fn();

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    const latencyMs = end - start;
    const throughputMbps = (inputBytes / (1024 * 1024)) / (latencyMs / 1000);
    const memoryMb = (endMem - startMem) / (1024 * 1024);
    const recordsPerSec = recordCount / (latencyMs / 1000);

    return {
      tool,
      conversion,
      dataset: `${(inputBytes / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: parseFloat(throughputMbps.toFixed(2)),
      latencyMs: parseFloat(latencyMs.toFixed(2)),
      memoryMb: parseFloat(memoryMb.toFixed(2)),
      recordsPerSec: parseFloat(recordsPerSec.toFixed(0)),
      success: true,
    };
  } catch (error: any) {
    return {
      tool,
      conversion,
      dataset: `${(inputBytes / (1024 * 1024)).toFixed(2)} MB`,
      throughputMbps: 0,
      latencyMs: 0,
      memoryMb: 0,
      recordsPerSec: 0,
      success: false,
      error: error?.message ?? String(error),
    };
  }
}

async function benchmarkNdjsonToJson(ndjson: string, recordCount: number): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(ndjson);
  const results: BenchmarkResult[] = [];

  results.push(
    await runBenchmark("convert-buddy", "NDJSON -> JSON", inputBytes, recordCount, async () => {
      await convert(Buffer.from(ndjson), {
        inputFormat: "ndjson",
        outputFormat: "json",
      });
    })
  );

  results.push(
    await runBenchmark("ndjson", "NDJSON -> JSON", inputBytes, recordCount, async () => {
      const ndjsonModule = await import("ndjson");
      const parser = ndjsonModule.default?.parse ? ndjsonModule.default.parse() : ndjsonModule.parse();
      let count = 0;
      await pipeline(
        Readable.from([ndjson]),
        parser,
        async function* (source) {
          for await (const _chunk of source) {
            count += 1;
          }
        }
      );
      if (count !== recordCount) {
        throw new Error(`Parsed ${count} records, expected ${recordCount}`);
      }
    })
  );

  results.push(
    await runBenchmark("split2+JSON.parse", "NDJSON -> JSON", inputBytes, recordCount, async () => {
      const split2Module = await import("split2");
      const split2 = split2Module.default ?? split2Module;
      let count = 0;
      await pipeline(
        Readable.from([ndjson]),
        split2(),
        async function* (source) {
          for await (const line of source) {
            if (!line) continue;
            JSON.parse(line.toString());
            count += 1;
          }
        }
      );
      if (count !== recordCount) {
        throw new Error(`Parsed ${count} records, expected ${recordCount}`);
      }
    })
  );

  results.push(
    await runBenchmark("json-nd", "NDJSON -> JSON", inputBytes, recordCount, async () => {
      const jsonNdModule = await import("json-nd");
      const parse = jsonNdModule.parse ?? jsonNdModule.default?.parse ?? jsonNdModule.default;
      if (typeof parse !== "function") {
        throw new Error("json-nd parse function not found");
      }
      const parsed = await parse(ndjson);
      if (Array.isArray(parsed) && parsed.length !== recordCount) {
        throw new Error(`Parsed ${parsed.length} records, expected ${recordCount}`);
      }
    })
  );

  return results;
}

async function benchmarkJsonToNdjson(records: Record<string, any>[], json: string): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(json);
  const recordCount = records.length;
  const results: BenchmarkResult[] = [];

  results.push(
    await runBenchmark("convert-buddy", "JSON -> NDJSON", inputBytes, recordCount, async () => {
      await convert(Buffer.from(json), {
        inputFormat: "json",
        outputFormat: "ndjson",
      });
    })
  );

  results.push(
    await runBenchmark("ndjson", "JSON -> NDJSON", inputBytes, recordCount, async () => {
      const ndjsonModule = await import("ndjson");
      const stringify = ndjsonModule.default?.stringify ? ndjsonModule.default.stringify() : ndjsonModule.stringify();
      const output: Buffer[] = [];
      await pipeline(Readable.from(records), stringify, async function* (source) {
        for await (const chunk of source) {
          output.push(Buffer.from(chunk));
        }
      });
      if (output.length === 0) {
        throw new Error("No NDJSON output generated");
      }
    })
  );

  results.push(
    await runBenchmark("json-nd", "JSON -> NDJSON", inputBytes, recordCount, async () => {
      const jsonNdModule = await import("json-nd");
      const stringify = jsonNdModule.stringify ?? jsonNdModule.default?.stringify ?? jsonNdModule.default;
      if (typeof stringify !== "function") {
        throw new Error("json-nd stringify function not found");
      }
      const output = await stringify(records);
      if (!output || output.length === 0) {
        throw new Error("No NDJSON output generated");
      }
    })
  );

  return results;
}

async function benchmarkCsvToJson(csv: string, recordCount: number): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(csv);
  const results: BenchmarkResult[] = [];

  results.push(
    await runBenchmark("convert-buddy", "CSV -> JSON", inputBytes, recordCount, async () => {
      await convert(Buffer.from(csv), {
        inputFormat: "csv",
        outputFormat: "json",
      });
    })
  );

  results.push(
    await runBenchmark("csvtojson", "CSV -> JSON", inputBytes, recordCount, async () => {
      const csvtojsonModule = await import("csvtojson");
      const csvtojson = csvtojsonModule.default ?? csvtojsonModule;
      const output = await csvtojson().fromString(csv);
      if (!Array.isArray(output)) {
        throw new Error("csvtojson did not return array output");
      }
    })
  );

  results.push(
    await runBenchmark("json-2-csv", "CSV -> JSON", inputBytes, recordCount, async () => {
      const json2csvModule = await import("json-2-csv");
      const csv2json = json2csvModule.csv2json ?? json2csvModule.default?.csv2json;
      if (typeof csv2json !== "function") {
        throw new Error("json-2-csv csv2json function not found");
      }
      const output = await csv2json(csv);
      if (!Array.isArray(output)) {
        throw new Error("json-2-csv did not return array output");
      }
    })
  );

  results.push(
    await runBenchmark("papaparse", "CSV -> JSON", inputBytes, recordCount, async () => {
      const papaModule = await import("papaparse");
      const Papa = papaModule.default ?? papaModule;
      const parsed = Papa.parse(csv, { header: true });
      if (!Array.isArray(parsed.data)) {
        throw new Error("PapaParse did not return data array");
      }
    })
  );

  results.push(
    await runBenchmark("csv-parse", "CSV -> JSON", inputBytes, recordCount, async () => {
      const { parse } = await import("csv-parse/sync");
      const output = parse(csv, { columns: true });
      if (!Array.isArray(output)) {
        throw new Error("csv-parse did not return array output");
      }
    })
  );

  results.push(
    await runBenchmark("@uchina-systems/csv-to-json", "CSV -> JSON", inputBytes, recordCount, async () => {
      const module = await import("@uchina-systems/csv-to-json");
      const csvToJson = module.csvToJson ?? module.default?.csvToJson ?? module.default;
      if (typeof csvToJson !== "function") {
        throw new Error("csv-to-json function not found");
      }
      const output = await csvToJson(csv);
      if (!output) {
        throw new Error("csv-to-json did not return output");
      }
    })
  );

  return results;
}

async function benchmarkJsonToCsv(records: Record<string, any>[], json: string): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(json);
  const recordCount = records.length;
  const results: BenchmarkResult[] = [];

  results.push(
    await runBenchmark("convert-buddy", "JSON -> CSV", inputBytes, recordCount, async () => {
      await convert(Buffer.from(json), {
        inputFormat: "json",
        outputFormat: "csv",
      });
    })
  );

  results.push(
    await runBenchmark("json2csv", "JSON -> CSV", inputBytes, recordCount, async () => {
      const json2csvModule = await import("json2csv");
      const Parser = json2csvModule.Parser ?? json2csvModule.default?.Parser;
      if (!Parser) {
        throw new Error("json2csv Parser not found");
      }
      const parser = new Parser();
      const csv = parser.parse(records);
      if (!csv) {
        throw new Error("json2csv returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("json-2-csv", "JSON -> CSV", inputBytes, recordCount, async () => {
      const json2csvModule = await import("json-2-csv");
      const json2csv = json2csvModule.json2csv ?? json2csvModule.default?.json2csv;
      if (typeof json2csv !== "function") {
        throw new Error("json-2-csv json2csv function not found");
      }
      const csv = await json2csv(records);
      if (!csv) {
        throw new Error("json-2-csv returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("papaparse", "JSON -> CSV", inputBytes, recordCount, async () => {
      const papaModule = await import("papaparse");
      const Papa = papaModule.default ?? papaModule;
      const csv = Papa.unparse(records);
      if (!csv) {
        throw new Error("PapaParse returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("csv-stringify", "JSON -> CSV", inputBytes, recordCount, async () => {
      const { stringify } = await import("csv-stringify/sync");
      const csv = stringify(records, { header: true });
      if (!csv) {
        throw new Error("csv-stringify returned empty output");
      }
    })
  );

  return results;
}

async function benchmarkXmlToJson(xml: string, recordCount: number): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(xml);
  const results: BenchmarkResult[] = [];

  results.push(
    await runBenchmark("convert-buddy", "XML -> JSON", inputBytes, recordCount, async () => {
      await convert(Buffer.from(xml), {
        inputFormat: "xml",
        outputFormat: "json",
      });
    })
  );

  results.push(
    await runBenchmark("fast-xml-parser", "XML -> JSON", inputBytes, recordCount, async () => {
      const fastXmlModule = await import("fast-xml-parser");
      const XMLParser = fastXmlModule.XMLParser ?? fastXmlModule.default?.XMLParser ?? fastXmlModule.default;
      const parser = new XMLParser();
      const output = parser.parse(xml);
      if (!output) {
        throw new Error("fast-xml-parser returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("xml2js", "XML -> JSON", inputBytes, recordCount, async () => {
      const xml2jsModule = await import("xml2js");
      const parseStringPromise = xml2jsModule.parseStringPromise ?? xml2jsModule.default?.parseStringPromise;
      if (typeof parseStringPromise !== "function") {
        throw new Error("xml2js parseStringPromise not found");
      }
      const output = await parseStringPromise(xml);
      if (!output) {
        throw new Error("xml2js returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("xml-js", "XML -> JSON", inputBytes, recordCount, async () => {
      const xmlJsModule = await import("xml-js");
      const xml2js = xmlJsModule.xml2js ?? xmlJsModule.default?.xml2js ?? xmlJsModule.default;
      if (typeof xml2js !== "function") {
        throw new Error("xml-js xml2js not found");
      }
      const output = xml2js(xml, { compact: true });
      if (!output) {
        throw new Error("xml-js returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("sax-wasm", "XML -> JSON", inputBytes, recordCount, async () => {
      const saxModule = await import("sax-wasm");
      const SAXParser = saxModule.SAXParser ?? saxModule.default?.SAXParser ?? saxModule.default;
      const SaxEventType = saxModule.SaxEventType ?? saxModule.default?.SaxEventType;
      if (!SAXParser || !SaxEventType) {
        throw new Error("sax-wasm SAXParser not found");
      }
      const wasmPath = path.resolve("node_modules/sax-wasm/lib/sax-wasm.wasm");
      const wasmBuffer = fs.readFileSync(wasmPath);
      const parser = new SAXParser(SaxEventType.OpenTag);
      await parser.prepareWasm(wasmBuffer);
      let seen = 0;
      parser.eventHandler = (eventType: number) => {
        if (eventType === SaxEventType.OpenTag) {
          seen += 1;
        }
      };
      parser.write(Buffer.from(xml));
      parser.end();
      if (seen === 0) {
        throw new Error("sax-wasm did not parse any tags");
      }
    })
  );

  return results;
}

async function benchmarkJsonToXml(records: Record<string, any>[], json: string): Promise<BenchmarkResult[]> {
  const inputBytes = Buffer.byteLength(json);
  const recordCount = records.length;
  const results: BenchmarkResult[] = [];

  const rootObject = { root: { record: records } };

  results.push(
    await runBenchmark("convert-buddy", "JSON -> XML", inputBytes, recordCount, async () => {
      await convert(Buffer.from(json), {
        inputFormat: "json",
        outputFormat: "xml",
      });
    })
  );

  results.push(
    await runBenchmark("fast-xml-parser", "JSON -> XML", inputBytes, recordCount, async () => {
      const fastXmlModule = await import("fast-xml-parser");
      const XMLBuilder = fastXmlModule.XMLBuilder ?? fastXmlModule.default?.XMLBuilder ?? fastXmlModule.default;
      const builder = new XMLBuilder();
      const xml = builder.build(rootObject);
      if (!xml) {
        throw new Error("fast-xml-parser returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("xml2js", "JSON -> XML", inputBytes, recordCount, async () => {
      const xml2jsModule = await import("xml2js");
      const Builder = xml2jsModule.Builder ?? xml2jsModule.default?.Builder;
      if (!Builder) {
        throw new Error("xml2js Builder not found");
      }
      const builder = new Builder();
      const xml = builder.buildObject(rootObject);
      if (!xml) {
        throw new Error("xml2js returned empty output");
      }
    })
  );

  results.push(
    await runBenchmark("xml-js", "JSON -> XML", inputBytes, recordCount, async () => {
      const xmlJsModule = await import("xml-js");
      const js2xml = xmlJsModule.js2xml ?? xmlJsModule.default?.js2xml ?? xmlJsModule.default;
      if (typeof js2xml !== "function") {
        throw new Error("xml-js js2xml not found");
      }
      const xml = js2xml(rootObject, { compact: true });
      if (!xml) {
        throw new Error("xml-js returned empty output");
      }
    })
  );

  return results;
}

async function benchmarkDetection(
  ndjson: string,
  json: string,
  csv: string,
  xml: string
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];

  const detectInput = [
    { name: "NDJSON", data: ndjson },
    { name: "JSON", data: json },
    { name: "CSV", data: csv },
    { name: "XML", data: xml },
  ];

  for (const target of detectInput) {
    const inputBytes = Buffer.byteLength(target.data);
    const recordCount = target.data.split("\n").length;

    results.push(
      await runBenchmark("file-type", `Detect ${target.name}`, inputBytes, recordCount, async () => {
        const fileTypeModule = await import("file-type");
        const fileTypeFromBuffer = fileTypeModule.fileTypeFromBuffer ?? fileTypeModule.default?.fileTypeFromBuffer;
        if (typeof fileTypeFromBuffer !== "function") {
          throw new Error("file-type fileTypeFromBuffer not found");
        }
        await fileTypeFromBuffer(Buffer.from(target.data));
      })
    );

    results.push(
      await runBenchmark("fast-xml-parser", `Detect ${target.name}`, inputBytes, recordCount, async () => {
        const fastXmlModule = await import("fast-xml-parser");
        const XMLValidator = fastXmlModule.XMLValidator ?? fastXmlModule.default?.XMLValidator ?? fastXmlModule.default;
        if (!XMLValidator) {
          throw new Error("fast-xml-parser XMLValidator not found");
        }
        XMLValidator.validate(target.data);
      })
    );

    results.push(
      await runBenchmark("ndjson", `Detect ${target.name}`, inputBytes, recordCount, async () => {
        const lines = target.data.split("\n").filter(Boolean);
        let valid = 0;
        for (const line of lines) {
          try {
            JSON.parse(line);
            valid += 1;
          } catch {
            break;
          }
        }
        if (target.name === "NDJSON" && valid === 0) {
          throw new Error("NDJSON detection failed");
        }
      })
    );

    results.push(
      await runBenchmark("custom-heuristic", `Detect ${target.name}`, inputBytes, recordCount, () => {
        const trimmed = target.data.trimStart();
        const firstChar = trimmed[0];
        if (firstChar === "<") {
          return;
        }
        if (firstChar === "{" || firstChar === "[") {
          return;
        }
        if (trimmed.includes("\n") && trimmed.includes("{")) {
          return;
        }
      })
    );
  }

  return results;
}

async function runBenchmarks() {
  console.log("=== 100MB Format Benchmark (Competitors) ===\n");
  console.log("Generating ~100MB datasets...");

  const datasets = buildLargeDatasets(TARGET_BYTES);
  console.log(
    `NDJSON: ${(Buffer.byteLength(datasets.ndjson) / (1024 * 1024)).toFixed(2)} MB | ` +
      `JSON: ${(Buffer.byteLength(datasets.json) / (1024 * 1024)).toFixed(2)} MB | ` +
      `CSV: ${(Buffer.byteLength(datasets.csv) / (1024 * 1024)).toFixed(2)} MB | ` +
      `XML: ${(Buffer.byteLength(datasets.xml) / (1024 * 1024)).toFixed(2)} MB`
  );

  const results: BenchmarkResult[] = [];

  results.push(...(await benchmarkNdjsonToJson(datasets.ndjson, datasets.recordCount)));
  results.push(...(await benchmarkJsonToNdjson(datasets.records, datasets.json)));
  results.push(...(await benchmarkCsvToJson(datasets.csv, datasets.recordCount)));
  results.push(...(await benchmarkJsonToCsv(datasets.records, datasets.json)));
  results.push(...(await benchmarkXmlToJson(datasets.xml, datasets.recordCount)));
  results.push(...(await benchmarkJsonToXml(datasets.records, datasets.json)));
  results.push(...(await benchmarkDetection(datasets.ndjson, datasets.json, datasets.csv, datasets.xml)));

  const outputPath = path.resolve("bench-results-100mb.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${outputPath}`);
}

runBenchmarks().catch((error) => {
  console.error("Benchmark run failed:", error);
  process.exit(1);
});
