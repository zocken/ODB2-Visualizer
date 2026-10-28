export const CHAT_LIMITS = Object.freeze({ first: 60_000, idle: 20_000, total: 120_000, lookup: 3_000 });

// Also bounds promises which ignore AbortSignal (for example a pending database query).
export function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason || new Error('Abgebrochen'));
  return new Promise((resolve, reject) => {
    const cancel = () => { cleanup(); reject(signal.reason || new Error('Abgebrochen')); };
    const cleanup = () => signal.removeEventListener('abort', cancel);
    signal.addEventListener('abort', cancel, { once: true });
    Promise.resolve(promise).then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
  });
}

export async function* boundedParts(parts, signal) {
  const iterator = parts[Symbol.asyncIterator]();
  try {
    for (;;) {
      const next = await abortable(iterator.next(), signal);
      if (next.done) return;
      yield next.value;
    }
  } finally { Promise.resolve(iterator.return?.()).catch(() => {}); }
}
