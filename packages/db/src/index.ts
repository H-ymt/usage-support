import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// 環境変数の読み込み（Node.js環境の場合）
if (typeof process !== "undefined" && !process.env?.DATABASE_URL) {
	try {
		// dotenvをインポート（Node.js環境でのみ利用可能）
		const dotenv = await import("dotenv");
		const { fileURLToPath } = await import("node:url");
		const { dirname, join } = await import("node:path");

		// 現在のファイルのパスから相対パスを計算
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);

		// 複数のパスから.envファイルを探す
		const possiblePaths = [
			join(__dirname, "..", "..", "..", "apps", "server", ".env"), // packages/dbから見た相対パス
			join(__dirname, "..", "..", "apps", "server", ".env"), // 別の構造の場合
		];

		for (const envPath of possiblePaths) {
			try {
				dotenv.config({ path: envPath });
				if (process.env.DATABASE_URL) break;
			} catch {
				// ファイルが見つからない場合は次を試す
			}
		}
	} catch {
		// dotenvのインポートに失敗した場合は無視（Cloudflare Workers環境など）
	}
}

// 環境変数の取得（Node.js環境優先、Cloudflare Workersにも対応）
const DATABASE_URL =
	typeof process !== "undefined" && process.env?.DATABASE_URL
		? process.env.DATABASE_URL
		: "";

// #region agent log
if (typeof process !== "undefined") {
	fetch("http://127.0.0.1:7242/ingest/fac55f56-1ecb-49fe-989f-62956cbeec26", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "db/index.ts:35",
			message: "db initialization",
			data: {
				hasProcess: typeof process !== "undefined",
				hasEnv: typeof process !== "undefined" && !!process.env?.DATABASE_URL,
				dbUrlLength: DATABASE_URL.length,
				dbUrlPrefix: DATABASE_URL.substring(0, 20),
			},
			timestamp: Date.now(),
			sessionId: "debug-session",
			runId: "run1",
			hypothesisId: "B",
		}),
	}).catch(() => {});
}
// #endregion

export const db = drizzle(DATABASE_URL, { schema });
