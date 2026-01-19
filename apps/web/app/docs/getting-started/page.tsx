import React from 'react';
export default function Page() {
  return (
    <div>
      <h1>Getting started</h1>
      <p>Quickstart and setup instructions for Convert Buddy.</p>

      <h2>Minimal example</h2>
      <pre>{`import { convertToString } from "convert-buddy-js";

const output = await convertToString(file, { outputFormat: "json" });`}</pre>

      <h2>Advanced example</h2>
      <pre>{`import { ConvertBuddy } from "convert-buddy-js";

const buddy = new ConvertBuddy({
  inputFormat: "csv",
  outputFormat: "json",
  transform: (record) => ({ ...record, loaded_at: Date.now() })
});

const outputStream = await buddy.convert(file);`}</pre>
    </div>
  );
}
