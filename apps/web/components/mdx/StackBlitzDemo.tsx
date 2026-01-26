"use client";

import React from "react";
import sdk, { VM } from "@stackblitz/sdk";

import csvSample from "!!raw-loader!../../public/samples/dnd_characters.csv";
import jsonSample from "!!raw-loader!../../public/samples/dnd_characters.json";
import ndjsonSample from "!!raw-loader!../../public/samples/dnd_characters.ndjson";
import xmlSample from "!!raw-loader!../../public/samples/dnd_characters.xml";

const SAMPLE_DATA: Record<string, string> = {
  json: jsonSample,
  ndjson: ndjsonSample,
  csv: csvSample,
  xml: xmlSample,
};

type SandpackFile = {
  code: string;
  active?: boolean;
  hidden?: boolean;
};

type SandpackTemplate = "node" | "node-ts" | "vanilla" | "vanilla-ts" | "react" | "react-ts";

export type Props = {
  files: Record<string, SandpackFile | string>;
  template?: SandpackTemplate;
  activeFile?: string;

  preview?: boolean;
  console?: boolean;
  showRunButton?: boolean;

  dependencyVersion?: string;

  editorHeight?: number;
  consoleHeight?: number;
  previewHeight?: number;

  enableFilePicker?: boolean;
  filePickerVariable?: string;
};

/** StackBlitz expects project-root relative file paths (no leading slash). */
function stripLeadingSlash(p: string) {
  return p.startsWith("/") ? p.slice(1) : p;
}

/** Normalize user file map into plain string contents. */
function coerceToStringFiles(files: Props["files"]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, value] of Object.entries(files)) {
    out[path] = typeof value === "string" ? value : value.code;
  }
  return out;
}

/**
 * Rewrite only the snippet entry file (src/snippet.ts) to inject sample data.
 * This keeps the harness stable and avoids surprise edits to other files.
 */
function rewriteSnippetForSampleData(args: {
  snippetCode: string;
  selectedFormat: string;
  filePickerVariable?: string;
}) {
  const { snippetCode, selectedFormat } = args;

  const sampleData = SAMPLE_DATA[selectedFormat] || SAMPLE_DATA.json;

  // Escape for template literal insertion
  const escapedData = sampleData
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  let code = snippetCode;

  // Replace fileUrl placeholder with embedded sample data + mock response
  code = code.replace(
    /const fileUrl = "";/,
    `const sampleData = \`${escapedData}\`;\nconst response = {\n  text: () => Promise.resolve(sampleData),\n  blob: () => Promise.resolve(new Blob([sampleData]))\n};`
  );

  // Replace fetch calls with the response object
  code = code.replace(/const response = await fetch\(fileUrl\);/g, "// Using embedded sample data with mock response");
  code = code.replace(/await fetch\(fileUrl\)/g, "response");

  // Replace response.text() usage to use sampleData directly
  code = code.replace(/const (\w+) = await response\.text\(\);/g, (_match, varName) => {
    if (varName === "sampleData") return "// sampleData already defined above";
    return `const ${varName} = sampleData;`;
  });

  // Update any hard-coded inputFormat
  code = code.replace(/inputFormat\s*[:=]\s*(['"`])\w+\1/g, `inputFormat: '${selectedFormat}'`);

  return code;
}

/**
 * WebContainers Vite+TS harness:
 * - index.html loads src/runner.ts
 * - runner imports src/snippet.ts with a cache-buster so "Run" truly reruns
 */
function makeWebContainersProject(opts: {
  title: string;
  dependencyVersion: string;
  userFiles: Record<string, string>; // leading slashes allowed
}) {
  const { title, dependencyVersion, userFiles } = opts;

  // Normalize leading slashes away for project files
  const userFilesNormalized: Record<string, string> = {};
  for (const [p, content] of Object.entries(userFiles)) {
    userFilesNormalized[stripLeadingSlash(p)] = content;
  }

  const baseFiles: Record<string, string> = {
    "package.json": JSON.stringify(
      {
        name: "generated-snippet",
        private: true,
        type: "module",
        scripts: {
          dev: "vite --host 0.0.0.0 --port 5173",
          start: "vite --host 0.0.0.0 --port 5173",
        },
        dependencies: {
          vite: "^5.0.0",
          "convert-buddy-js": dependencyVersion || "latest",
        },
        devDependencies: {
          typescript: "^5.2.2",
        },
      },
      null,
      2
    ),

    "tsconfig.json": JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          skipLibCheck: true,
          types: [],
        },
        include: ["src"],
      },
      null,
      2
    ),

    "index.html": `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { background:#0b0d10; color:#cbd5e1; font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial; padding:12px; }
      #toolbar { display:flex; gap:10px; align-items:center; margin-bottom:10px; }
      #out { white-space:pre-wrap; font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace; font-size:12px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; max-height:70vh; overflow:auto; }
      .pill { padding:6px 10px; border:1px solid rgba(255,255,255,0.12); border-radius:999px; background:rgba(255,255,255,0.04); }
    </style>
  </head>
  <body>
    <div id="toolbar">
      <span class="pill">Preview output</span>
      <span class="pill" id="status">boot</span>
    </div>
    <pre id="out"></pre>
    <script type="module" src="/src/runner.ts"></script>
  </body>
</html>`,

    // Stable runner: captures console, prints output, imports snippet with cache buster
    "src/runner.ts": `const out = document.getElementById("out") as HTMLPreElement | null;
const statusEl = document.getElementById("status");

function setStatus(s: string) {
  if (statusEl) statusEl.textContent = s;
}

function appendLine(...args: any[]) {
  if (!out) return;
  const s = args.map(a => {
    try {
      // Handle Error objects specially to show the message
      if (a instanceof Error) {
        return a.stack || a.message || String(a);
      }
      // For objects, try to stringify, but if it's empty or fails, convert to string
      if (typeof a === "object" && a !== null) {
        const stringified = JSON.stringify(a, null, 2);
        // If JSON.stringify returns an empty object, try to get more info
        if (stringified === "{}") {
          return String(a);
        }
        return stringified;
      }
      return String(a);
    } catch { 
      return String(a); 
    }
  }).join(" ");
  out.textContent += s + "\\n";
  out.scrollTop = out.scrollHeight;
}

const raw = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
};

console.log = (...a: any[]) => { appendLine(...a); raw.log(...a); };
console.error = (...a: any[]) => { appendLine("[ERROR]", ...a); raw.error(...a); };
console.warn = (...a: any[]) => { appendLine("[WARN]", ...a); raw.warn(...a); };
console.info = (...a: any[]) => { appendLine("[INFO]", ...a); raw.info(...a); };

// allow host to force rerun by setting window.__SNIPPET_RUN_ID__
declare global {
  interface Window { __SNIPPET_RUN_ID__?: number; }
}

async function boot() {
  const runId = (window.__SNIPPET_RUN_ID__ ?? 0);
  setStatus("running #" + runId);
  appendLine("Running snippet, runId=" + runId);

  try {
    // Cache-buster to avoid ESM module cache during reruns
    await import(/* @vite-ignore */ "./snippet.ts?t=" + runId + "&_=" + Date.now());
    setStatus("ok");
  } catch (e: any) {
    setStatus("error");
    console.error(e?.stack || e?.message || String(e));
  }
}

boot();`,

    // Default snippet so the project always runs
    "src/snippet.ts": `// @ts-expect-error - package installed at runtime
import { convertToString } from "convert-buddy-js";

async function run() {
  const sampleData = \`[
    { "name": "Gorwin \\\\\\"Grog\\\\\\" Oakenshield", "race": "Human", "class": "Barbarian", "quirk": "Collects spoons from every tavern" }
  ]\`;

  const csv = await convertToString(sampleData, { outputFormat: "csv" });
  console.log("Converted to CSV:");
  console.log(csv);
}

run().catch(console.error);
`,

    // Optional demo worker (not required)
    "src/snippet.worker.ts": `self.onmessage = (e: MessageEvent) => {
  const { input } = (e.data || {}) as any;
  // do heavy work here
  (self as any).postMessage({ ok: true, length: String(input ?? "").length });
};`,
    "vite.config.ts": `import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ["convert-buddy-js"],
  },
});`,
  };

  const files = { ...baseFiles, ...userFilesNormalized };

  return {
    title,
    description: "Generated on the fly via @stackblitz/sdk",
    template: "node" as const,
    files,
  };
}

async function applyAllFiles(vm: VM, files: Record<string, string>) {
  await vm.applyFsDiff({ create: files, destroy: [] });
}

export function StackBlitzExampleImpl({
  files,
  template = "node",
  activeFile,
  preview,
  console: showConsole = true,
  showRunButton = true,
  dependencyVersion,
  editorHeight = 360,
  consoleHeight = 220,
  previewHeight = 360,
  enableFilePicker = false,
  filePickerVariable = "sampleData",
}: Props) {
  const [selectedFormat, setSelectedFormat] = React.useState<string>("json");

  // Interpret incoming files, but enforce that the runnable snippet is src/snippet.ts.
  // If caller provided /src/snippet.ts, we use it. Otherwise we fall back to:
  // - /src/main.ts
  // - /index.ts
  // - /index.js
  // - first provided file
  const coercedIncoming = React.useMemo(() => coerceToStringFiles(files), [files]);

  function pickInitialSnippetSource(all: Record<string, string>) {
    const candidates = ["/src/snippet.ts", "/src/main.ts", "/index.ts", "/index.js"];
    for (const c of candidates) {
      if (all[c] != null) return { path: c, code: all[c] };
    }
    const first = Object.keys(all)[0];
    if (first) return { path: first, code: all[first] };
    return { path: "/src/snippet.ts", code: "" };
  }

  const initialSnippet = React.useMemo(() => pickInitialSnippetSource(coercedIncoming), [coercedIncoming]);

  // Baseline: stable harness + user files mapped + snippet normalized for current format (if enabled)
  const baseline = React.useMemo(() => {
    const fmt = enableFilePicker ? selectedFormat : "json";
    const rewrittenSnippet = rewriteSnippetForSampleData({
      snippetCode: initialSnippet.code,
      selectedFormat: fmt,
      filePickerVariable,
    });

    // Keep user files around (for multi-file examples), but force snippet to src/snippet.ts
    const merged: Record<string, string> = { ...coercedIncoming };
    merged["/src/snippet.ts"] = rewrittenSnippet;

    // Optionally remove legacy entrypoints so there’s only one “entry”
    // (prevents confusion in your file list)
    delete merged["/src/main.ts"];
    delete merged["/index.ts"];
    delete merged["/index.js"];

    return merged;
  }, [coercedIncoming, enableFilePicker, selectedFormat, filePickerVariable, initialSnippet.code]);

  // Editable state is the source of truth (your own editor)
  const [filesState, setFilesState] = React.useState<Record<string, string>>(() => ({ ...baseline }));

  React.useEffect(() => {
    setFilesState({ ...baseline });
  }, [baseline]);

  // For your editor UI, show the "virtual project" files (including harness files would be noisy).
  // We'll show only user-editable files by default: src/snippet.ts + any provided extra files.
  const visibleFiles = React.useMemo(() => {
    const keys = Object.keys(filesState);

    // Hide harness files from the editor list
    const hidden = new Set([
      "/package.json",
      "/tsconfig.json",
      "/index.html",
      "/src/runner.ts",
    ]);

    // also hide worker if you don't want to expose it
    // hidden.add("/src/snippet.worker.ts");

    return keys
      .filter((k) => !hidden.has(k))
      .sort((a, b) => (a === "/src/snippet.ts" ? -1 : b === "/src/snippet.ts" ? 1 : a.localeCompare(b)));
  }, [filesState]);

  const defaultActive = activeFile && filesState[activeFile] != null ? activeFile : "/src/snippet.ts";
  const [activePath, setActivePath] = React.useState<string>(defaultActive);

  React.useEffect(() => {
    if (activeFile && filesState[activeFile] != null) setActivePath(activeFile);
  }, [activeFile, filesState]);

  const vmRef = React.useRef<VM | null>(null);
  const embedId = React.useId().replace(/:/g, "-");

  // For StackBlitz, "preview" view is the closest to your "console + results" UX.
  const resolvedPreviewProp = preview ?? true;
  const embedView: "default" | "preview" | "editor" = "default";

  // A monotonically increasing run id that we inject into the runner by updating a tiny file.
  const runIdRef = React.useRef<number>(0);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const project = makeWebContainersProject({
        title: "Runnable snippet",
        dependencyVersion: dependencyVersion ?? "latest",
        userFiles: filesState,
      });

      const vm = await sdk.embedProject(embedId, project, {
        height: editorHeight + previewHeight + (showConsole ? consoleHeight : 0),
        view: embedView,
        hideExplorer: true,
        hideNavigation: true,
        terminalHeight: showConsole ? 20 : 0,
        openFile: "src/snippet.ts",
      });

      if (cancelled) return;
      vmRef.current = vm;

      // Push initial state
      await applyAllFiles(vm, project.files);
    })();

    return () => {
      cancelled = true;
      vmRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedId]);

  async function pushToVm(nextFilesState: Record<string, string>, bumpRunId: boolean) {
    const vm = vmRef.current;
    if (!vm) return;

    const nextRunId = bumpRunId ? (runIdRef.current += 1) : runIdRef.current;

    // We inject run id by writing a tiny inline script into index.html via window var.
    // Simplest: rewrite runner.ts content to read the run id from window.__SNIPPET_RUN_ID__
    // and then we update index.html to set it. This avoids needing VM APIs beyond applyFsDiff.
    const project = makeWebContainersProject({
      title: "Runnable snippet",
      dependencyVersion: dependencyVersion ?? "latest",
      userFiles: nextFilesState,
    });

    // Patch index.html to set run id before runner loads (stable and deterministic)
    const indexHtml = project.files["index.html"];
    const patchedIndex =
      indexHtml.replace(
        `<script type="module" src="/src/runner.ts"></script>`,
        `<script>window.__SNIPPET_RUN_ID__=${nextRunId};</script>\n    <script type="module" src="/src/runner.ts"></script>`
      );

    project.files["index.html"] = patchedIndex;

    await applyAllFiles(vm, project.files);
  }

  async function onRun() {
    // bump run id so runner import cache-buster changes
    await pushToVm(filesState, true);
  }

  async function onReset() {
    const resetFiles = { ...baseline };
    setFilesState(resetFiles);
    await pushToVm(resetFiles, true);
  }

  async function onSelectFormat(fmt: string) {
    if (!enableFilePicker) return;
    setSelectedFormat(fmt);

    // Rewrite only the snippet and rerun
    const rewritten = rewriteSnippetForSampleData({
      snippetCode: initialSnippet.code,
      selectedFormat: fmt,
      filePickerVariable,
    });

    const nextFiles = { ...filesState, ["/src/snippet.ts"]: rewritten };
    setFilesState(nextFiles);
    await pushToVm(nextFiles, true);
  }

  function updateActiveFileCode(next: string) {
    setFilesState((prev) => ({ ...prev, [activePath]: next }));
  }

  async function onOpenFile(path: string) {
    setActivePath(path);

    // Best-effort: also open in StackBlitz editor (if user switches embed to editor view)
    const vm = vmRef.current;
    if (vm?.editor?.setCurrentFile) {
      try {
        await vm.editor.setCurrentFile(stripLeadingSlash(path));
      } catch {
        // ignore
      }
    }
  }

  const activeCode = filesState[activePath] ?? "";

  return (
    <div
      className={["not-prose", "rounded-xl", "border", "border-white/10", "bg-[#0B0D10]", "overflow-hidden"].join(" ")}
      style={{ color: "white" }}
    >
      {/* Toolbar - only show when enableFilePicker is true */}
      {enableFilePicker ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 10, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {[
              { ext: "json", label: "JSON" },
              { ext: "ndjson", label: "NDJSON" },
              { ext: "csv", label: "CSV" },
              { ext: "xml", label: "XML" },
            ].map(({ ext, label }) => (
              <button
                key={ext}
                type="button"
                onClick={() => void onSelectFormat(ext)}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: 6,
                  background: selectedFormat === ext ? "rgba(255,255,255,0.12)" : "transparent",
                  fontWeight: selectedFormat === ext ? 700 : 500,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* StackBlitz runtime embed */}
      <div id={embedId} />
    </div>
  );
}
