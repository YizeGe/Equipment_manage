// ============ 客户端 API 封装 ============

export class ApiError extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // 会话过期或未登录：跳转登录页
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth/")) {
      window.location.href = "/login";
    }
    throw new ApiError((data as { error?: string }).error ?? `请求失败 (${res.status})`, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => req<T>(url),
  post: <T>(url: string, body: unknown) =>
    req<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    req<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(url: string) => req<T>(url, { method: "DELETE" }),
};
