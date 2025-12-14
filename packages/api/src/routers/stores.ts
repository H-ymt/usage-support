import { db } from "@usage-support/db";
import { stores } from "@usage-support/db/schema/app";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../index";

/**
 * 店舗関連のAPIルーター
 */
export const storesRouter = router({
	/**
	 * 有効な店舗の一覧を取得
	 */
	getAll: publicProcedure.query(async () => {
		// #region agent log
		fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				location: "stores.ts:13",
				message: "stores.getAll called",
				data: {},
				timestamp: Date.now(),
				sessionId: "debug-session",
				runId: "run1",
				hypothesisId: "A",
			}),
		}).catch(() => {});
		// #endregion
		try {
			// #region agent log
			fetch(
				"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "stores.ts:16",
						message: "before db query",
						data: { dbExists: !!db },
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
					}),
				},
			).catch(() => {});
			// #endregion
			const activeStores = await db
				.select({
					storeId: stores.storeId,
					name: stores.name,
					address: stores.address,
					phone: stores.phone,
					businessHours: stores.businessHours,
				})
				.from(stores)
				.where(eq(stores.isActive, true))
				.orderBy(stores.name);

			// #region agent log
			fetch(
				"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "stores.ts:28",
						message: "after db query",
						data: {
							count: activeStores.length,
							stores: activeStores.map((s) => ({
								id: s.storeId,
								name: s.name,
							})),
						},
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
					}),
				},
			).catch(() => {});
			// #endregion
			return activeStores;
		} catch (error) {
			// #region agent log
			fetch(
				"http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						location: "stores.ts:32",
						message: "db query error",
						data: {
							errorMessage:
								error instanceof Error ? error.message : String(error),
							errorStack: error instanceof Error ? error.stack : undefined,
						},
						timestamp: Date.now(),
						sessionId: "debug-session",
						runId: "run1",
						hypothesisId: "A",
					}),
				},
			).catch(() => {});
			// #endregion
			throw error;
		}
	}),
});
