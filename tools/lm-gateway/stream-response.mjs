import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';

export async function forwardEventStream(upstream, response, {signal, onChunk = () => {}} = {}) {
  if (!upstream.body) throw Error('Missing upstream stream');
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Accel-Buffering': 'no',
    'X-Content-Type-Options': 'nosniff',
  });
  response.flushHeaders();
  const activity = new Transform({
    transform(chunk, _encoding, callback) {
      onChunk();
      callback(null, chunk);
    },
  });
  // Keep the original bytes, including UTF-8 boundaries, SSE frames and [DONE].
  // pipeline propagates backpressure and stops upstream reads on cancellation.
  await pipeline(Readable.fromWeb(upstream.body), activity, response, {signal});
}
