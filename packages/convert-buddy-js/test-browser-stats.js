import { ConvertBuddy } from "./dist/browser.js";

console.log("Testing stats in browser-like environment...");

try {
  const buddy = await ConvertBuddy.create({
    inputFormat: "json",
    outputFormat: "csv",
    profile: true,
    debug: true
  });

  console.log("ConvertBuddy created successfully");
  console.log("Initial stats:", buddy.stats());

  const data = '[{"name":"Test","value":123}]';
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);

  const output = buddy.push(bytes);
  console.log("After push, stats:", buddy.stats());

  const final = buddy.finish();
  console.log("After finish, stats:", buddy.stats());

  console.log("\n✓ Browser test passed!");
} catch (error) {
  console.error("❌ Browser test failed:", error);
  console.error(error.stack);
}
