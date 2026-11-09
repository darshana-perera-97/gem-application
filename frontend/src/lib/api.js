// Empty REACT_APP_API_URL = same-origin (when the API serves the frontend build).
const rawApiBase = process.env.REACT_APP_API_URL;
export const API_BASE =
  rawApiBase === undefined || rawApiBase === null
    ? "http://localhost:1324"
    : String(rawApiBase).trim().replace(/\/$/, "");

export const SERVER_DOWN_MESSAGE = "The server is currently unavailable. Please contact the system administrator.";

const listeners = new Set();
let serverDown = false;

export function subscribeServerStatus(listener) {
  listeners.add(listener);
  listener(serverDown);
  return () => listeners.delete(listener);
}

function setServerDown(next) {
  if (serverDown === next) return;
  serverDown = next;
  listeners.forEach((listener) => listener(serverDown));
}

function serverDownError() {
  const error = new Error(SERVER_DOWN_MESSAGE);
  error.code = "SERVER_DOWN";
  return error;
}

function isNetworkFailure(error) {
  const message = String(error?.message || "");
  return error instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(message);
}

export async function apiFetch(url, options) {
  try {
    const response = await fetch(url, options);
    setServerDown(false);
    return response;
  } catch (error) {
    if (isNetworkFailure(error)) {
      setServerDown(true);
      throw serverDownError();
    }
    throw error;
  }
}

async function request(path, options = {}) {
  const response = await apiFetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export function apiGet(path, options = {}) {
  return request(path, {
    method: "GET",
    credentials: options.credentials,
  });
}

export function apiPost(path, body, options = {}) {
  return request(path, {
    method: "POST",
    credentials: options.credentials,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete(path, options = {}) {
  return request(path, {
    method: "DELETE",
    credentials: options.credentials,
  });
}
