"use client";

import React from "react";
import dynamic from "next/dynamic";
import { SandpackExampleImpl } from "./SandpackImplementation";

/**
 * Default export is a client-only dynamic wrapper (SSR disabled).
 * Import/use THIS component everywhere to avoid hydration mismatches.
 */
const SandpackExample = dynamic(
  () => Promise.resolve(SandpackExampleImpl),
  { ssr: false }
);

export default SandpackExample;
