import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Add logging middleware
app.use("*", async (c, next) => {
  console.log(`[Hono] ${c.req.method} ${c.req.url}`);
  console.log(`[Hono] Headers:`, Object.fromEntries(c.req.raw.headers.entries()));
  const start = Date.now();
  
  try {
    await next();
    const end = Date.now();
    console.log(`[Hono] ${c.req.method} ${c.req.url} - ${end - start}ms - Status: ${c.res.status}`);
  } catch (error) {
    const end = Date.now();
    console.error(`[Hono] ${c.req.method} ${c.req.url} - ${end - start}ms - ERROR:`, error);
    throw error;
  }
});

// Simple health check endpoint
app.get("/", (c) => {
  console.log('[Hono] Health check endpoint hit');
  return c.json({ status: "ok", message: "API is running", timestamp: new Date().toISOString() });
});

// Test endpoint for debugging
app.get("/test", (c) => {
  console.log('[Hono] Test endpoint hit');
  return c.json({ message: "Test endpoint working", timestamp: new Date().toISOString() });
});

// tRPC health check
app.get("/trpc-health", (c) => {
  console.log('[Hono] tRPC health check endpoint hit');
  return c.json({ 
    message: "tRPC server is configured", 
    router: "appRouter",
    timestamp: new Date().toISOString() 
  });
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError: ({ error, path, type, input }) => {
      console.error(`[tRPC Error] ${type} ${path}:`, {
        error: error.message,
        code: error.code,
        input,
        stack: error.stack
      });
    },
  })
);

// Catch-all route for debugging
app.all("*", (c) => {
  console.log(`[Hono] Unhandled route: ${c.req.method} ${c.req.url}`);
  return c.json({ error: "Route not found", url: c.req.url, method: c.req.method }, 404);
});

export default app;