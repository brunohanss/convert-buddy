import { ConvertBuddy } from "./dist/index.js";

console.log("=== Test 1: WITHOUT profile (should show warning) ===");
const buddyNoProfile = await ConvertBuddy.create({
  inputFormat: "json",
  outputFormat: "csv",
  profile: false
});

console.log("Initial stats:", buddyNoProfile.stats());

const data = JSON.stringify([{ name: "Test", value: 123 }]);
const encoder = new TextEncoder();
const bytes = encoder.encode(data);

buddyNoProfile.push(bytes);
console.log("After push:", buddyNoProfile.stats());

buddyNoProfile.finish();
console.log("After finish:", buddyNoProfile.stats());

console.log("\n=== Test 2: WITH profile (should have real stats) ===");
const buddyWithProfile = await ConvertBuddy.create({
  inputFormat: "json",
  outputFormat: "csv",
  profile: true
});

console.log("Initial stats:", buddyWithProfile.stats());

buddyWithProfile.push(bytes);
console.log("After push:", buddyWithProfile.stats());

buddyWithProfile.finish();
console.log("After finish:", buddyWithProfile.stats());

console.log("\n✓ Tests complete!");
