import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Add logging middleware
app.use("*", async (c, next) => {
  console.log(`[Hono] ${c.req.method} ${c.req.url}`);
  await next();
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      console.error(`[tRPC Error] ${path}:`, error);
    },
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  console.log('[Hono] Health check endpoint hit');
  return c.json({ status: "ok", message: "API is running" });
});

// Catch-all route for debugging
app.all("*", (c) => {
  console.log(`[Hono] Unhandled route: ${c.req.method} ${c.req.url}`);
  return c.json({ error: "Route not found" }, 404);
});

export default app;