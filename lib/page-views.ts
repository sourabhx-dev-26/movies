let pageEvent = crypto.randomUUID();
export async function recordPageView(newNavigation = false) {
  if (newNavigation) pageEvent = crypto.randomUUID();
  const eventId = pageEvent;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId }), keepalive: true, cache: "no-store" });
      if (response.ok || response.status < 500) return;
    } catch { /* Retry this page view with the same identifier. */ }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
  }
}
