import type { Transform as NodeTransform } from "node:stream";

import { ConvertBuddy, type ConvertBuddyOptions } from "./index.js";

export * from "./index.js";

// Node.js Transform Stream adapter
async function loadNodeTransform(): Promise<typeof import("node:stream").Transform> {
  const isNode =
    typeof process !== "undefined" &&
    !!(process as any).versions?.node;

  if (!isNode) {
    throw new Error("createNodeTransform is only available in Node.js runtimes.");
  }

  const streamModule = await import("node:stream");
  return streamModule.Transform;
}

export async function createNodeTransform(
  opts: ConvertBuddyOptions = {}
): Promise<NodeTransform> {
  let buddy: ConvertBuddy | null = null;
  let initPromise: Promise<void> | null = null;

  const Transform = await loadNodeTransform();
  const transform = new Transform({
    async transform(chunk: Buffer, encoding: string, callback: Function) {
      try {
        if (!buddy) {
          if (!initPromise) {
            initPromise = ConvertBuddy.create(opts).then((b) => {
              buddy = b;
            });
          }
          await initPromise;
        }

        const input = new Uint8Array(chunk);
        const output = buddy!.push(input);

        if (output.length > 0) {
          this.push(Buffer.from(output));
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },

    async flush(callback: Function) {
      try {
        if (buddy) {
          const output = buddy.finish();
          if (output.length > 0) {
            this.push(Buffer.from(output));
          }

          if (opts.profile) {
            const stats = buddy.stats();
            console.log("[convert-buddy] Performance Stats:", stats);
          }
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });

  return transform;
}
