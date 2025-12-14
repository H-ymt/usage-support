import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import Loader from "./components/loader";
import "./index.css";
import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@usage-support/api/routers/index";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { TRPCProvider } from "./utils/trpc";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: () => {
						queryClient.invalidateQueries();
					},
				},
			});
		},
	}),
	defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

// サーバーURLの決定: 環境変数が設定されている場合はそれを使用、そうでない場合は現在のホストから推測
let serverUrl = import.meta.env.VITE_SERVER_URL;

// 環境変数が未設定、空文字列、またはlocalhostの場合に自動判定
if (
	(!serverUrl || serverUrl === "" || serverUrl.includes("localhost")) &&
	typeof window !== "undefined"
) {
	const currentHost = window.location.hostname;
	if (
		currentHost.includes("ngrok-free.dev") ||
		currentHost.includes("ngrok.io")
	) {
		// ngrok経由でアクセスしている場合、環境変数の設定が必要
		// 一時的に同じドメインを使用（webとserverが別URLの場合は404エラーになる）
		serverUrl = `https://${currentHost}`;
		// #region agent log
		fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "router.tsx:38",
				message: "ngrok detected but VITE_SERVER_URL not set",
				data: {
					serverUrl,
					currentHost,
					warning:
						"VITE_SERVER_URL環境変数を設定してください。ngrok管理画面(http://localhost:4040)でサーバーのURLを確認し、apps/web/.envに設定してください。",
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "run1",
				hypothesisId: "E",
			}),
		}).catch(() => {});
		// #endregion
		console.warn(
			"⚠️ VITE_SERVER_URL環境変数が設定されていません。ngrok管理画面(http://localhost:4040)でサーバーのURLを確認し、apps/web/.envに設定してください。",
		);
	} else {
		// ローカル環境の場合は localhost:3000 を使用
		serverUrl = "http://localhost:3000";
	}
}

// #region agent log
if (typeof window !== "undefined") {
	fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "router.tsx:45",
			message: "trpc client config",
			data: {
				serverUrl,
				trpcUrl: `${serverUrl}/trpc`,
				currentHost:
					typeof window !== "undefined" ? window.location.hostname : undefined,
			},
			timestamp: Date.now(),
			sessionId: "debug-session",
			runId: "run1",
			hypothesisId: "E",
		}),
	}).catch(() => {});
}
// #endregion

const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${serverUrl}/trpc`,
			fetch(url, options) {
				// #region agent log
				if (typeof window !== "undefined") {
					fetch(
						"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								location: "router.tsx:40",
								message: "trpc fetch called",
								data: { url, method: options?.method },
								timestamp: Date.now(),
								sessionId: "debug-session",
								runId: "run1",
								hypothesisId: "E",
							}),
						},
					).catch(() => {});
				}
				// #endregion
				return fetch(url, {
					...options,
					credentials: "include",
				})
					.then((response) => {
						// #region agent log
						if (typeof window !== "undefined") {
							fetch(
								"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
								{
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										location: "router.tsx:47",
										message: "trpc fetch response",
										data: {
											url,
											status: response.status,
											statusText: response.statusText,
											ok: response.ok,
										},
										timestamp: Date.now(),
										sessionId: "debug-session",
										runId: "run1",
										hypothesisId: "E",
									}),
								},
							).catch(() => {});
						}
						// #endregion
						return response;
					})
					.catch((error) => {
						// #region agent log
						if (typeof window !== "undefined") {
							fetch(
								"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
								{
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({
										location: "router.tsx:54",
										message: "trpc fetch error",
										data: {
											url,
											errorMessage:
												error instanceof Error ? error.message : String(error),
										},
										timestamp: Date.now(),
										sessionId: "debug-session",
										runId: "run1",
										hypothesisId: "E",
									}),
								},
							).catch(() => {});
						}
						// #endregion
						throw error;
					});
			},
		}),
	],
});

const trpc = createTRPCOptionsProxy({
	client: trpcClient,
	queryClient: queryClient,
});

export const getRouter = () => {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: { trpc, queryClient },
		defaultPendingComponent: () => <Loader />,
		defaultNotFoundComponent: () => <div>Not Found</div>,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>
				<TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
					{children}
				</TRPCProvider>
			</QueryClientProvider>
		),
	});
	return router;
};

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
