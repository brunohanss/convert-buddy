import { ConvertBuddy } from "./dist/index.js";

console.log("=== Test 1: Small file (no warning expected) ===");
const smallData = JSON.stringify([{ name: "Test", value: 123 }]);
const buddy1 = new ConvertBuddy();
await buddy1.convert(smallData, { outputFormat: "csv" });
console.log("✓ Small file converted\n");

console.log("=== Test 2: Large file - 15MB (warning expected) ===");
// Generate ~15MB of JSON data
const largeArray = [];
for (let i = 0; i < 100000; i++) {
  largeArray.push({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    description: "Lorem ipsum dolor sit amet consectetur adipiscing elit"
  });
}
const largeData = JSON.stringify(largeArray);
console.log(`Generated ${(largeData.length / 1024 / 1024).toFixed(1)}MB of data`);

const buddy2 = new ConvertBuddy();
await buddy2.convert(largeData, { outputFormat: "csv" });
console.log("✓ Large file converted\n");

console.log("=== Test 3: Blob with large size (warning expected) ===");
const largeBlob = new Blob([largeData]);
console.log(`Blob size: ${(largeBlob.size / 1024 / 1024).toFixed(1)}MB`);
const buddy3 = new ConvertBuddy();
await buddy3.convert(largeBlob, { outputFormat: "ndjson" });
console.log("✓ Large blob converted\n");

console.log("✓ All tests complete!");
