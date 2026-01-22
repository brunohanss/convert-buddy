import { describe, it } from "node:test";
import assert from "node:assert";
import { ConvertBuddy, convertAnyToString } from "../../node.js";
import type { ConvertBuddyOptions } from "../../node.js";

const CSV_SAMPLE = `id,name,price
1,Widget,19.99
2,Gadget,29.95
`;

const JSON_SAMPLE = JSON.stringify([
  { id: 1, name: "Widget", price: "19.99" },
  { id: 2, name: "Gadget", price: "29.95" },
]);

const NDJSON_SAMPLE = `{"id":1,"name":"Widget","price":"19.99"}\n{"id":2,"name":"Gadget","price":"29.95"}\n`;

const XML_SAMPLE = `<?xml version="1.0" encoding="utf-8"?>\n<root>\n  <record><id>1</id><name>Widget</name><price>19.99</price></record>\n  <record><id>2</id><name>Gadget</name><price>29.95</price></record>\n</root>`;

function toUint8(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

function concatOutputs(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function parseCsvToObjects(csv: string) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const obj: Record<string, any> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = cols[i] ?? "";
    }
    return obj;
  });
}

function parseNdjsonToObjects(nd: string) {
  return nd
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function parseJsonToObjects(js: string) {
  return JSON.parse(js);
}

function findFirstArray(obj: any): any[] | null {
  if (Array.isArray(obj)) return obj;
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      const res = findFirstArray(obj[k]);
      if (res) return res;
    }
  }
  return null;
}

async function parseXmlToObjectsViaConvert(xml: string) {
  // Convert XML to JSON using convert-buddy, then parse the JSON
  const jsonBytes = await convertRaw(xml, "xml", "json");
  const jsonStr = new TextDecoder().decode(jsonBytes);
  const objs = parseJsonToObjects(jsonStr);
  // JSON output may be an array or an object containing an array; find first array
  const arr = findFirstArray(objs);
  return arr ?? [];
}

async function convertRaw(
  inputStr: string,
  inFmt: string,
  outFmt: string,
  opts: Partial<ConvertBuddyOptions> = {}
) {
  const buddy = await ConvertBuddy.create({
    ...opts,
    inputFormat: inFmt as any,
    outputFormat: outFmt as any,
  });
  const pushed = buddy.push(toUint8(inputStr));
  const fin = buddy.finish();
  return concatOutputs([pushed, fin]);
}

describe("Roundtrip conversions (JS)", () => {
  it("NDJSON <-> JSON preserves records and values", async () => {
    const ndOut = await convertRaw(JSON_SAMPLE, "json", "ndjson");
    const ndStr = new TextDecoder().decode(ndOut);
    const objs = parseNdjsonToObjects(ndStr);
    const back = await convertRaw(ndStr, "ndjson", "json");
    const backStr = new TextDecoder().decode(back);
    const backObjs = parseJsonToObjects(backStr);

    assert.strictEqual(objs.length, backObjs.length);
    for (let i = 0; i < objs.length; i++) {
      assert.deepStrictEqual(objs[i], backObjs[i]);
    }
  });

  it("CSV -> NDJSON -> XML -> JSON -> CSV preserves header fields and values", async () => {
    // CSV -> NDJSON
    const nd = await convertRaw(CSV_SAMPLE, "csv", "ndjson");
    const ndStr = new TextDecoder().decode(nd);
    const ndObjs = parseNdjsonToObjects(ndStr);

    // NDJSON -> XML
    const xml = await convertRaw(ndStr, "ndjson", "xml");
    const xmlStr = new TextDecoder().decode(xml);
    const xmlObjs = await parseXmlToObjectsViaConvert(xmlStr);

    // XML -> JSON
    const js = await convertRaw(xmlStr, "xml", "json");
    const jsStr = new TextDecoder().decode(js);
    const jsObjs = parseJsonToObjects(jsStr);

    // JSON -> CSV
    const csv = await convertRaw(jsStr, "json", "csv");
    const csvStr = new TextDecoder().decode(csv);
    const csvObjs = parseCsvToObjects(csvStr);

    // Compare counts
    assert.strictEqual(parseCsvToObjects(CSV_SAMPLE).length, csvObjs.length);

    // Compare each record by header fields (id,name,price)
    const original = parseCsvToObjects(CSV_SAMPLE);
    for (let i = 0; i < original.length; i++) {
      const orig = original[i];
      const got = csvObjs[i];
      for (const k of Object.keys(orig)) {
        assert.strictEqual(String(orig[k]), String(got[k]));
      }
    }
  });
});

describe("XML conversions (JS)", () => {
  it("XML -> NDJSON includes attributes when configured", async () => {
    const xml = "<items><item id=\"1\"><name>Widget</name></item><item id=\"2\"><name>Gadget</name></item></items>";
    const nd = await convertRaw(xml, "xml", "ndjson", {
      xmlConfig: {
        recordElement: "item",
        includeAttributes: true,
      },
    });
    const ndStr = new TextDecoder().decode(nd);
    const objs = parseNdjsonToObjects(ndStr);
    assert.strictEqual(objs.length, 2);
    assert.strictEqual(objs[0]["@id"], "1");
    assert.strictEqual(objs[0].name, "Widget");
  });
});

describe("High-level API (JS)", () => {
  it("ConvertBuddy.convert auto-detects CSV input", async () => {
    const buddy = new ConvertBuddy();
    const output = await buddy.convert(CSV_SAMPLE, { outputFormat: "json" });
    const parsed = parseJsonToObjects(new TextDecoder().decode(output));
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].name, "Widget");
  });

  it("convertAnyToString auto-detects NDJSON input", async () => {
    const json = await convertAnyToString(NDJSON_SAMPLE, { outputFormat: "json" });
    const parsed = parseJsonToObjects(json);
    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[1].name, "Gadget");
  });
});
