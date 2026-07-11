// Server-side only. Typed fetch wrapper for the slskd REST API.

const SLSKD_BASE = process.env.SLSKD_URL ?? "http://localhost:5030";
const SLSKD_API_KEY = process.env.SLSKD_API_KEY ?? "";

export class SlskdError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function slskd<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${SLSKD_BASE}/api/v0${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "X-API-Key": SLSKD_API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SlskdError(res.status, `slskd ${res.status} on ${path}: ${body}`);
  }

  // Some endpoints (DELETE, PUT) return no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
