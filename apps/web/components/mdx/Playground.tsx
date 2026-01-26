"use client";

import React from "react";
import dynamic from "next/dynamic";
import { StackBlitzExampleImpl } from "./StackBlitzDemo";

/**
 * Default export is a client-only dynamic wrapper (SSR disabled).
 * Import/use THIS component everywhere to avoid hydration mismatches.
 */
const PlaygroundExample = dynamic(
  () => Promise.resolve(StackBlitzExampleImpl),
  { ssr: false }
);

export default PlaygroundExample;
