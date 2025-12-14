import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
	const trpc = useTRPC();
	const healthCheck = useQuery(trpc.healthCheck.queryOptions());
	const stores = useQuery(trpc.stores.getAll.queryOptions());

	// #region agent log
	if (typeof window !== "undefined") {
		fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "index.tsx:28",
				message: "stores query state",
				data: {
					isLoading: stores.isLoading,
					hasError: !!stores.error,
					errorMessage: stores.error?.message,
					hasData: !!stores.data,
					dataLength: stores.data?.length,
				},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "run1",
				hypothesisId: "D",
			}),
		}).catch(() => {});
	}
	// #endregion

	return (
		<div className="container mx-auto max-w-3xl px-4 py-2">
			<pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
			<div className="grid gap-6">
				<section className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">API Status</h2>
					<div className="flex items-center gap-2">
						<div
							className={`h-2 w-2 rounded-full ${healthCheck.data ? "bg-green-500" : "bg-red-500"}`}
						/>
						<span className="text-muted-foreground text-sm">
							{healthCheck.isLoading
								? "Checking..."
								: healthCheck.data
									? "Connected"
									: "Disconnected"}
						</span>
					</div>
				</section>

				<section className="rounded-lg border p-4">
					<h2 className="mb-4 font-medium text-lg">店舗一覧</h2>
					{stores.isLoading && (
						<p className="text-muted-foreground text-sm">読み込み中...</p>
					)}
					{stores.error && (
						<p className="text-red-500 text-sm">
							エラー: {stores.error.message}
						</p>
					)}
					{stores.data && stores.data.length === 0 && (
						<p className="text-muted-foreground text-sm">
							店舗が登録されていません
						</p>
					)}
					{stores.data && stores.data.length > 0 && (
						<div className="grid gap-4">
							{stores.data.map((store) => (
								<div
									key={store.storeId}
									className="rounded-md border p-4 transition-colors hover:bg-accent"
								>
									<h3 className="mb-2 font-medium">{store.name}</h3>
									<div className="space-y-1 text-muted-foreground text-sm">
										{store.address && <p>📍 {store.address}</p>}
										{store.phone && <p>📞 {store.phone}</p>}
										{store.businessHours && <p>🕒 {store.businessHours}</p>}
									</div>
								</div>
							))}
						</div>
					)}
				</section>
			</div>
		</div>
	);
}
