"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackConsole,
  SandpackPreview,
} from "@codesandbox/sandpack-react";
import * as SandpackReact from "@codesandbox/sandpack-react";

// Import sample data files directly using raw-loader
import csvSample from "!!raw-loader!../../public/samples/dnd_characters.csv";
import jsonSample from "!!raw-loader!../../public/samples/dnd_characters.json";
import ndjsonSample from "!!raw-loader!../../public/samples/dnd_characters.ndjson";
import xmlSample from "!!raw-loader!../../public/samples/dnd_characters.xml";

// Sample data mapping
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

type SandpackTemplate =
  | "react"
  | "react-ts"
  | "vanilla"
  | "vanilla-ts"
  | "node"
  | "node-ts";

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

function normalizeFiles(files: Props["files"], selectedFormat: string = "json") {
  const out: Record<string, SandpackFile> = {};
  for (const [path, value] of Object.entries(files)) {
    let code = typeof value === "string" ? value : value.code;
    // Replace empty fileUrl placeholder with embedded sample data
    const sampleData = SAMPLE_DATA[selectedFormat] || SAMPLE_DATA.json;
    
    // Properly escape the sample data for use in JavaScript string literal
    // Don't use JSON.stringify as it will double-escape already-escaped quotes
    const escapedData = sampleData
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/`/g, '\\`')     // Escape backticks for template literal
      .replace(/\$/g, '\\$');   // Escape dollar signs for template literal
    
    // Replace fileUrl declaration and create a mock response object
    code = code.replace(/const fileUrl = "";/, 
      `const sampleData = \`${escapedData}\`;\nconst response = { \n  text: () => Promise.resolve(sampleData),\n  blob: () => Promise.resolve(new Blob([sampleData]))\n};`);
    
    // Replace fetch calls with the response object
    code = code.replace(/const response = await fetch\(fileUrl\);/g, '// Using embedded sample data with mock response');
    code = code.replace(/await fetch\(fileUrl\)/g, 'response');
    
    // Replace variable assignments from response.text() to use sampleData directly
    code = code.replace(/const (\w+) = await response\.text\(\);/g, (match, varName) => {
      if (varName === 'sampleData') {
        return '// sampleData already defined above';
      }
      return `const ${varName} = sampleData;`;
    });

    // If the example hard-codes an inputFormat value, update it to the selected format
    code = code.replace(/inputFormat\s*[:=]\s*(['"`])\w+\1/g, `inputFormat: '${selectedFormat}'`);
    
    out[path] = { code, active: typeof value === "string" ? undefined : value.active };
  }
  return out;
}

function isNodeTemplate(t: SandpackTemplate) {
  return t === "node" || t === "node-ts";
}

export function SandpackExampleImpl({
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
  // State for selected sample file format
  const [selectedFormat, setSelectedFormat] = React.useState<string>("json");
  const normalized = normalizeFiles(files, selectedFormat);

  if (template === "node" && !normalized["/index.js"]) {
    throw new Error('The "node" template requires a "/index.js" entry file.');
  }

  // Keep an internal editable copy of the files so user edits are preserved
  // across remounts/reruns. Initialize from the normalized files once.
  const [filesState, setFilesState] = React.useState<Record<string, SandpackFile>>(
    () => ({ ...normalized })
  );
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const filesStateRef = React.useRef(filesState);
  React.useEffect(() => {
    filesStateRef.current = filesState;
  }, [filesState]);

  // Update files when selected format changes
  React.useEffect(() => {
    const newNormalized = normalizeFiles(files, selectedFormat);
    setFilesState({ ...newNormalized });
  }, [selectedFormat, files]);

  const resolvedPreviewProp = preview ?? !isNodeTemplate(template);

  // runKey forces remount of SandpackProvider in legacy flows; kept for
  // compatibility but we prefer updateFile so we don't wipe user edits.
  const [runKey, setRunKey] = React.useState(0);
  const changeTimeoutRef = React.useRef<number | null>(null);

  // Hide Sandpack 'Client' console button globally. Sandpack generates the
  // console toolbar dynamically, so use a MutationObserver to remove/hide the
  // button when it appears.
  React.useEffect(() => {
    function hideClientButtons() {
      try {
        const btns = document.querySelectorAll<HTMLButtonElement>(
          '.sp-console-header-actions .sp-console-header-button'
        );
        btns.forEach((b) => {
          if (b.textContent && b.textContent.trim().toLowerCase() === 'client') {
            b.style.display = 'none';
          }
        });
      } catch (e) {
        // ignore
      }
    }

    hideClientButtons();

    const observer = new MutationObserver(() => {
      hideClientButtons();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // Inject file picker buttons into the tabs header (if enabled) and run/reset into console
  React.useEffect(() => {
    let injectionTimeout: NodeJS.Timeout | null = null;

    function injectFilePickerAndButtons() {
      try {
        // Inject file picker buttons into tabs header
        if (enableFilePicker) {
          const tabsContainers = document.querySelectorAll<HTMLElement>('.sp-tabs-scrollable-container');
          tabsContainers.forEach((tabsContainer) => {
            // Check if already injected in this container
            const parentContainer = tabsContainer.parentElement;
            if (!parentContainer || parentContainer.querySelector('[data-cb-file-picker]')) {
              return;
            }

            // Create wrapper for file picker buttons - append directly to tabs container
            const wrapper = document.createElement('div');
            wrapper.setAttribute('data-cb-file-picker', '1');
            wrapper.style.cssText = 'display: flex; gap: 6px; align-items: center; margin-left: auto; padding: 0 12px;';

            // Create format buttons
            const fileTypes = [
              { ext: 'json', label: 'JSON' },
              { ext: 'ndjson', label: 'NDJSON' },
              { ext: 'csv', label: 'CSV' },
              { ext: 'xml', label: 'XML' }
            ];

            fileTypes.forEach(({ ext, label }) => {
              const btn = document.createElement('button');
              btn.setAttribute('type', 'button');
              btn.setAttribute('aria-label', `Use ${label} sample`);
              btn.setAttribute('data-cb-file', ext);
              btn.className = 'sp-c-bxeRRt sp-c-dEbKhQ sp-c-eyPpSQ sp-tab-button';
              btn.style.cssText = 'font-size: 11px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;';
              btn.textContent = label;
              
              btn.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('convert-buddy-file-select', {
                  detail: { fileType: ext, origin: btn }
                }));
              });

              // Update button style when selected
              const updateButtonStyle = (e: Event) => {
                const ce = e as CustomEvent;
                const isSelected = ext === ce.detail?.fileType;
                if (isSelected) {
                  btn.style.cssText = 'font-size: 11px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; background: rgba(255,255,255,0.15); font-weight: 600;';
                } else {
                  btn.style.cssText = 'font-size: 11px; padding: 6px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer;';
                }
              };
              
              window.addEventListener('convert-buddy-file-select', updateButtonStyle);
              wrapper.appendChild(btn);
            });

            // Append directly inside the tabs container so it stays on same line
            tabsContainer.appendChild(wrapper);
          });
        }

        // Inject run and reset buttons into console header
        const actions = document.querySelectorAll<HTMLElement>('.sp-console-header .sp-console-header-actions');
        actions.forEach((action) => {
          if (action.querySelector('[data-cb-run]')) return; // already injected

          // Create Run button
          const runBtn = document.createElement('button');
          runBtn.setAttribute('type', 'button');
          runBtn.setAttribute('aria-label', 'Run sandbox');
          runBtn.setAttribute('data-cb-run', '1');
          runBtn.className = 'sp-c-bxeRRt sp-c-dEbKhQ sp-c-eyPpSQ sp-console-header-button';
          runBtn.style.cssText = 'margin-right:6px;';
          runBtn.innerHTML = `<svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><polygon points="3 2 10 6 3 10 3 2"></polygon></svg>`;

          // Create Reset button
          const resetBtn = document.createElement('button');
          resetBtn.setAttribute('type', 'button');
          resetBtn.setAttribute('aria-label', 'Reset sandbox');
          resetBtn.setAttribute('data-cb-reset', '1');
          resetBtn.className = 'sp-c-bxeRRt sp-c-dEbKhQ sp-c-eyPpSQ sp-console-header-button';
          resetBtn.style.cssText = 'margin-right:6px;';
          resetBtn.innerHTML = `<svg fill="none" height="12" viewBox="0 0 12 12" width="12" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><path d="M10 2a4 4 0 0 0-4 4m0 0a4 4 0 0 1-4-4m4 4v-3M2 6a4 4 0 1 0 8 0" stroke-width="1" stroke-linecap="round"/></svg>`;

          // Insert before Server button if present, and hide the Server button
          const serverBtn = action.querySelector<HTMLElement>('button[data-active="true"], button[aria-label*="Server"], button[title*="Server"]');
          if (serverBtn && serverBtn.parentElement) {
            serverBtn.parentElement.insertBefore(resetBtn, serverBtn);
            serverBtn.parentElement.insertBefore(runBtn, resetBtn);
            try {
              serverBtn.style.display = 'none';
            } catch (e) {
              // ignore
            }
          } else {
            action.appendChild(runBtn);
            action.appendChild(resetBtn);
          }

          runBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('convert-buddy-run', {
              detail: { origin: runBtn }
            }));
          });

          resetBtn.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('convert-buddy-reset', {
              detail: { origin: resetBtn }
            }));
          });
        });
      } catch (e) {
        // ignore DOM errors
      }
    }

    // Inject immediately
    injectFilePickerAndButtons();

    // Debounce observer to prevent freeze
    const obs = new MutationObserver(() => {
      if (injectionTimeout) clearTimeout(injectionTimeout);
      injectionTimeout = setTimeout(injectFilePickerAndButtons, 500);
    });

    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      if (injectionTimeout) clearTimeout(injectionTimeout);
    };
  }, [enableFilePicker]);

  // Always keep the preview hidden (we still mount a hidden iframe so logs
  // and runtime errors appear in the Sandpack console). This avoids showing
  // the preview pane in docs while still executing code.
  const resolvedPreviewForConsole = false;

  // Editor + Console child lives inside SandpackProvider so it can call
  // useSandpack(). We declare it here so it has access to outer state and
  // refs.
  function EditorAndConsole({
    editorHeight,
    consoleHeight,
    showConsole,
  }: {
    editorHeight: number;
    consoleHeight: number;
    showConsole: boolean;
  }) {
    const sandpackApi = (SandpackReact as any).useSandpack ? (SandpackReact as any).useSandpack() : ({} as any);
    const { sandpack, openFile } = sandpackApi;

    const activePath = activeFile ?? Object.keys(filesState)[0];

    // Set up run event listener and open active file
    React.useEffect(() => {
      if (activePath && typeof openFile === "function") {
        try {
          openFile(activePath);
        } catch (e) {
          // ignore
        }
      }

      function onRun(e: Event) {
        const ce = e as CustomEvent;
        const origin = ce?.detail?.origin as HTMLElement | undefined;
        // If this run event didn't originate from a button inside our
        // wrapper, ignore it (prevents affecting other sandpacks on page).
        if (origin && wrapperRef.current && !wrapperRef.current.contains(origin)) {
          return;
        }

        // Get the current files from Sandpack - try multiple paths
        const sandpackFiles = sandpackApi.files || sandpack?.files || sandpackApi.sandpack?.files;
        
        // Update filesState with what Sandpack actually has
        if (sandpackFiles && typeof sandpackFiles === 'object') {
          const updatedFiles: Record<string, SandpackFile> = {};
          Object.entries(sandpackFiles).forEach(([path, file]: [string, any]) => {
            updatedFiles[path] = {
              code: file.code || '',
              active: file.active,
              hidden: file.hidden
            };
          });
          filesStateRef.current = updatedFiles;
          setFilesState(updatedFiles);
        } else {
          console.log('[Sandpack Debug] Could not get sandpackFiles, will use current filesState');
        }

        // console.log('[Sandpack Debug] Running with files:', filesStateRef.current);

        // Force remount with current filesState to execute updated code
        setRunKey((k) => k + 1);
      }

      function onReset(e: Event) {
        const ce = e as CustomEvent;
        const origin = ce?.detail?.origin as HTMLElement | undefined;
        // If this reset event didn't originate from a button inside our
        // wrapper, ignore it (prevents affecting other sandpacks on page).
        if (origin && wrapperRef.current && !wrapperRef.current.contains(origin)) {
          return;
        }

        console.log('[Sandpack Debug] Resetting to original files');
        
        // Reset to original normalized files with current format
        const resetFiles = normalizeFiles(files, selectedFormat);
        filesStateRef.current = { ...resetFiles };
        setFilesState({ ...resetFiles });
        
        // Force remount to reload with original code
        setRunKey((k) => k + 1);
      }

      async function onFileSelect(e: Event) {
        const ce = e as CustomEvent;
        const origin = ce?.detail?.origin as HTMLElement | undefined;
        const fileType = ce?.detail?.fileType as string | undefined;

        // If this event didn't originate from a button inside our wrapper, ignore it
        if (origin && wrapperRef.current && !wrapperRef.current.contains(origin)) {
          return;
        }

        if (!fileType) return;

        setSelectedFormat(fileType);

        // Get the embedded sample data for this format
        const sampleData = SAMPLE_DATA[fileType] || SAMPLE_DATA.json;

        // Update the code to inject the sample data variable
        const updatedFiles = { ...filesStateRef.current };
        Object.keys(updatedFiles).forEach(path => {
          if (path.endsWith('.js') || path.endsWith('.ts')) {
            let code = updatedFiles[path].code;
            
            // Replace the sampleData variable value (handles both fileUrl and sampleData patterns)
            const urlPattern = /const fileUrl = [`'"][\s\S]*?[`'"];/;
            const dataPattern = /const sampleData = [`'"][\s\S]*?[`'"];/;
            
            if (urlPattern.test(code)) {
              code = code.replace(
                urlPattern,
                `const sampleData = ${JSON.stringify(sampleData)};`
              );
            } else if (dataPattern.test(code)) {
              code = code.replace(
                dataPattern,
                `const sampleData = ${JSON.stringify(sampleData)};`
              );
            }
            
            // Also replace fetch patterns 
            code = code.replace(/const response = await fetch\(fileUrl\);[\s\S]*?const sampleData = await response\.text\(\);/g, 
              '// Sample data is embedded directly\n  // const sampleData is already available above');
            code = code.replace(/fetch\(fileUrl\)/g, 'Promise.resolve({ text: () => Promise.resolve(sampleData) })');

            // Update any hard-coded inputFormat to the newly selected fileType
            code = code.replace(/inputFormat\s*[:=]\s*(['"`])\w+\1/g, `inputFormat: '${fileType}'`);

            updatedFiles[path] = { ...updatedFiles[path], code };
          }
        });

        filesStateRef.current = updatedFiles;
        setFilesState(updatedFiles);

          // Force remount to execute with new sample data
          setRunKey((k) => k + 1);
      }

      window.addEventListener('convert-buddy-run', onRun as EventListener);
      window.addEventListener('convert-buddy-reset', onReset as EventListener);
      window.addEventListener('convert-buddy-file-select', onFileSelect as EventListener);

      return () => {
        window.removeEventListener('convert-buddy-run', onRun as EventListener);
        window.removeEventListener('convert-buddy-reset', onReset as EventListener);
        window.removeEventListener('convert-buddy-file-select', onFileSelect as EventListener);
      };
    }, [sandpackApi, sandpack]);

    return (
      <>
        <SandpackCodeEditor
          style={{ height: editorHeight }}
          showTabs
          showLineNumbers
          wrapContent
        />
        {showConsole ? <SandpackConsole style={{ height: consoleHeight }} /> : null}
      </>
    );
  }

  return (
    <div
      className={[
        "not-prose",
        "rounded-xl",
        "border",
        "border-white/10",
        "bg-[#0B0D10]",
        "overflow-hidden",
      ].join(" ")}
      ref={wrapperRef}
    >
      <style>{`
        /* keep our previous Client button hiding via MutationObserver;
           do not hide or move Sandpack's built-in Run button here */
      `}</style>
      <style>{`
        /* Make console header slightly taller so our larger Run button fits */
        .sp-console-header {
          min-height: 44px !important;
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }

        /* Make the header actions area wrap and shrink to available space */
        .sp-console-header .sp-console-header-actions {
          display: flex !important;
          gap: 8px !important;
          flex-wrap: wrap !important;
          max-width: 240px !important;
          align-items: center !important;
        }

        /* Ensure buttons don't overflow when scaled */
        .sp-console-header .sp-console-header-button {
          white-space: nowrap !important;
        }
      `}</style>

      <SandpackProvider
        key={runKey}
        template={template}
        files={filesState}
        customSetup={
          // If the user supplied a /node_modules override inside `files`, don't
          // ask Sandpack to fetch the dependency. Otherwise install the
          // configured `dependencyVersion` or default to `latest`.
          Object.keys(normalized).some((p) => p.startsWith("/node_modules/"))
            ? undefined
            : {
                dependencies: {
                  "convert-buddy-js": dependencyVersion ?? "latest",
                },
              }
        }
        options={{
          activeFile,
          visibleFiles: Object.keys(filesState),
          autorun: true,
          autoReload: true,
          recompileMode: "immediate",
          recompileDelay: 0,
        }}
        theme="dark"
      >
        <SandpackLayout style={{ border: "none" }}>
          <div style={{ width: resolvedPreviewProp ? "50%" : "100%" }}>
            <EditorAndConsole
              editorHeight={editorHeight}
              consoleHeight={consoleHeight}
              showConsole={showConsole}
            />
          </div>

          {/* If you want preview, show it normally */}
          {resolvedPreviewProp ? (
            <div style={{ width: "50%" }}>
              <SandpackPreview style={{ height: previewHeight }} />
            </div>
          ) : (
            /**
             * Key fix: still mount the preview iframe so code executes
             * and the console can receive runtime logs, but keep it hidden.
             */
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                width: 1,
                height: 1,
                overflow: "hidden",
                clip: "rect(0 0 0 0)",
                clipPath: "inset(50%)",
                whiteSpace: "nowrap",
              }}
            >
              <SandpackPreview style={{ height: 1, width: 1 }} />
            </div>
          )}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
