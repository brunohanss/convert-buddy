"use client";

import React from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole
} from "@codesandbox/sandpack-react";

type SandpackFile = {
  code: string;
  active?: boolean;
  hidden?: boolean;
};

type Props = {
  /** Map of file paths to file contents */
  files: Record<string, SandpackFile | string>;
  /** Which template to use */
  template?: "react" | "react-ts" | "vanilla" | "vanilla-ts";
  /** Which file is initially open */
  activeFile?: string;
  /** Show preview */
  preview?: boolean;
  /** Show console */
  console?: boolean;
  /** Editor height */
  editorHeight?: number;
  /** Preview height */
  previewHeight?: number;
};

function normalizeFiles(files: Props["files"]) {
  const out: Record<string, SandpackFile> = {};
  for (const [path, value] of Object.entries(files)) {
    out[path] = typeof value === "string" ? { code: value } : value;
  }
  return out;
}

export default function SandpackExample({
  files,
  template = "react-ts",
  activeFile,
  preview = true,
  console: showConsole = false,
  editorHeight = 360,
  previewHeight = 360
}: Props) {
  const normalized = normalizeFiles(files);

  return (
    <div
      className={[
        "not-prose",
        "rounded-xl",
        "border",
        "border-white/10",
        "bg-[#0B0D10]",
        "overflow-hidden"
      ].join(" ")}
    >
      <SandpackProvider
        template={template}
        files={normalized}
        customSetup={{
          dependencies: {
            "convert-buddy-js": "latest"
          }
        }}
        options={{
          activeFile,
          visibleFiles: Object.keys(normalized),
          autorun: preview,
          autoReload: preview
        }}
        theme="dark"
      >
        <SandpackLayout
          style={{
            border: "none"
          }}
        >
          <div style={{ width: "50%" }}>
            <SandpackCodeEditor
              style={{ height: editorHeight }}
              showTabs
              showLineNumbers
              wrapContent
            />
            {showConsole ? <SandpackConsole style={{ height: 180 }} /> : null}
          </div>

          {preview ? (
            <div style={{ width: "50%" }}>
              <SandpackPreview style={{ height: previewHeight }} />
            </div>
          ) : null}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
