interface RequestLike {
  method?: string;
  headers?: Record<string, unknown>;
}

interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '').toLowerCase();
}

function getAllowedOrigins(): string[] {
  const configured = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const appBase = process.env.APP_BASE_URL ? String(process.env.APP_BASE_URL).trim() : '';
  if (appBase) {
    configured.push(appBase);
  }

  configured.push('http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173');

  return Array.from(new Set(configured.map(normalizeOrigin)));
}

export function applyCors(req: RequestLike, res: ResponseLike): boolean {
  const originHeader = req.headers?.origin;
  const origin = typeof originHeader === 'string' ? normalizeOrigin(originHeader) : '';
  const allowedOrigins = getAllowedOrigins();

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', originHeader as string);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-api-key');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return true;
  }

  if (origin && !allowedOrigins.includes(origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return true;
  }

  return false;
}

export function requireAdminApiKey(req: RequestLike, res: ResponseLike): boolean {
  const configuredKey = process.env.ADMIN_API_KEY;

  if (!configuredKey) {
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Server misconfiguration' });
      return false;
    }

    // Allow local development without this guard for convenience.
    return true;
  }

  const keyHeader = req.headers?.['x-admin-api-key'];
  const providedKey = typeof keyHeader === 'string' ? keyHeader : '';

  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  return true;
}
