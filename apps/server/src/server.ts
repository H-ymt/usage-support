// 環境変数読み込み（最初に実行）

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env");

console.log("📁 Loading .env from:", envPath);
config({ path: envPath });

import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@usage-support/api/context";
import { appRouter } from "@usage-support/api/routers/index";
import { auth } from "@usage-support/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "http://localhost:3001",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use("/trpc/*", async (c, next) => {
	// #region agent log
	fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "server.ts:38",
			message: "trpc middleware start",
			data: { path: c.req.path, method: c.req.method },
			timestamp: Date.now(),
			sessionId: "debug-session",
			runId: "run1",
			hypothesisId: "C",
		}),
	}).catch(() => {});
	// #endregion
	try {
		const handler = trpcServer({
			router: appRouter,
			createContext: (_opts, context) => {
				// #region agent log
				fetch(
					"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							location: "server.ts:45",
							message: "trpc createContext",
							data: { path: context.req.path },
							timestamp: Date.now(),
							sessionId: "debug-session",
							runId: "run1",
							hypothesisId: "C",
						}),
					},
				).catch(() => {});
				// #endregion
				return createContext({ context });
			},
		});
		const response = await handler(c.req.raw, c.env, c.executionCtx);
		// #region agent log
		fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "server.ts:52",
				message: "trpc response ready",
				data: {
					status: response.status,
					statusText: response.statusText,
					ok: response.ok,
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "run1",
				hypothesisId: "C",
			}),
		}).catch(() => {});
		// #endregion
		return response;
	} catch (error) {
		// #region agent log
		fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "server.ts:57",
				message: "trpc middleware error",
				data: {
					errorMessage: error instanceof Error ? error.message : String(error),
					errorStack: error instanceof Error ? error.stack : undefined,
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "run1",
				hypothesisId: "C",
			}),
		}).catch(() => {});
		// #endregion
		throw error;
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

const port = Number(process.env.PORT) || 3000;

console.log(`Server is running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
