// Kubernetes probe target — unauthenticated, no session, no DB access.
export const loader = () => new Response("OK", { status: 200 });
