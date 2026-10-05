export default {
  async fetch(request) {
    try {
      const { handleApiRequest } = await import("../dist/server.mjs");
      return await handleApiRequest(request);
    } catch (error) {
      console.error("Movies API startup failed", error);
      return Response.json({ error: "The movie API could not start. Check this deployment’s runtime logs." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  },
};
