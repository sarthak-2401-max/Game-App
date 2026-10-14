// Development logging. Verbose output only in development builds; errors are always kept
// so crash reporters (future) can pick them up.
const dev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
type Level = 'debug' | 'info' | 'warn' | 'error';
const quiet = typeof process !== 'undefined' && process.env?.JEST_WORKER_ID !== undefined;

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  if (quiet && level !== 'error') return;
  if (!dev && (level === 'debug' || level === 'info')) return;
  const line = `[${scope}] ${msg}`;
   
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line, extra ?? '');
}

export const log = {
  debug: (s: string, m: string, e?: unknown) => emit('debug', s, m, e),
  info: (s: string, m: string, e?: unknown) => emit('info', s, m, e),
  warn: (s: string, m: string, e?: unknown) => emit('warn', s, m, e),
  error: (s: string, m: string, e?: unknown) => emit('error', s, m, e),
};
