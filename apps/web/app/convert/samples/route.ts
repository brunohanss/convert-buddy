import { NextRequest, NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { join } from 'path';

const ALLOWED_FILES = new Set([
  'dnd_characters.json',
  'dnd_characters.ndjson',
  'dnd_characters.csv',
  'dnd_characters.xml',
]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const file = url.searchParams.get('file');

  if (!file || !ALLOWED_FILES.has(file)) {
    return NextResponse.json({ error: 'file not found' }, { status: 404 });
  }

  const filePath = join(process.cwd(), 'public', 'samples', file);

  try {
    const nodeStream = createReadStream(filePath);

    // Convert a Node.js Readable into a WHATWG ReadableStream compatible with Next's Response.
    function nodeToWeb(node: NodeJS.ReadableStream): ReadableStream {
      const reader = (node as any)[Symbol.asyncIterator]();
      return new ReadableStream({
        async pull(controller) {
          try {
            const { value, done } = await reader.next();
            if (done) {
              controller.close();
            } else {
              controller.enqueue(value);
            }
          } catch (err) {
            controller.error(err as Error);
          }
        },
        cancel() {
          if (typeof (node as any).destroy === 'function') (node as any).destroy();
        },
      });
    }

    const webStream = nodeToWeb(nodeStream);
    const res = new NextResponse(webStream);
    // Set content-type based on extension
    if (file.endsWith('.json')) res.headers.set('Content-Type', 'application/json');
    if (file.endsWith('.ndjson')) res.headers.set('Content-Type', 'application/x-ndjson');
    if (file.endsWith('.csv')) res.headers.set('Content-Type', 'text/csv');
    if (file.endsWith('.xml')) res.headers.set('Content-Type', 'application/xml');

    return res;
  } catch (e) {
    return NextResponse.json({ error: 'unable to read file' }, { status: 500 });
  }
}
