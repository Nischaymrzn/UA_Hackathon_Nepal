async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function get(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const validateEmail  = (email)        => post("/api/validate/email",  { email });
export const validateDomain = (domain)       => post("/api/validate/domain", { domain });
export const lookupMX       = (domain)       => get(`/api/mx?domain=${encodeURIComponent(domain)}`);
export const runTests       = ()             => get("/api/test");
export const checkHealth    = ()             => get("/health");
export const sendOtp        = (email)        => post("/api/send-otp",    { email });
export const verifyOtp      = (email, code)  => post("/api/verify-otp",  { email, code });
