type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogMeta = Record<string, unknown>;

const serialize = (value: unknown): unknown => {
  if (value instanceof Error) return { name: value.name, message: value.message, stack: value.stack };
  return value;
};

const write = (level: LogLevel, message: string, meta?: LogMeta) => {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'sk-connect-backend',
    message,
    ...(meta ? Object.fromEntries(Object.entries(meta).map(([key, value]) => [key, serialize(value)])) : {}),
  });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
};

const normalizeMeta = (args: unknown[]): LogMeta | undefined => {
  if (!args.length) return undefined;
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof Error)) return args[0] as LogMeta;
  return { details: args.map(serialize) };
};

export const logger = {
  info: (message: string, ...args: unknown[]) => write('info', message, normalizeMeta(args)),
  warn: (message: string, ...args: unknown[]) => write('warn', message, normalizeMeta(args)),
  error: (message: string, ...args: unknown[]) => write('error', message, normalizeMeta(args)),
  debug: (message: string, ...args: unknown[]) => write('debug', message, normalizeMeta(args)),
};
