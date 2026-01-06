import { ConvertBuddy } from "./index.js";

async function main() {
  const buddy = await ConvertBuddy.create({ debug: true });

  const input = new TextEncoder().encode("hello\n");
  const out1 = buddy.push(input);
  const out2 = buddy.finish();

  const merged = new Uint8Array(out1.length + out2.length);
  merged.set(out1, 0);
  merged.set(out2, out1.length);

  console.log("output:", new TextDecoder().decode(merged));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
