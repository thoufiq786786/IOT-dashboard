function buildHeaders(hasBody = false) {
  const headers = {};
  if (hasBody) headers["Content-Type"] = "application/json";

  const token = localStorage.getItem("authToken");
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiGet(path) {
  const res = await fetch(path, { headers: buildHeaders(false) });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(`GET ${path} failed with ${res.status}`);
  }
  return res.json();
}

export async function apiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: buildHeaders(Boolean(body)),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(`${method} ${path} failed with ${res.status}`);
  }
  if (res.status === 204) {
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
