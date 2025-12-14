// 環境変数読み込み（最優先）

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// ESModulesの場合のみ__dirnameを取得
let envPath: string;
if (typeof import.meta.url !== "undefined") {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	// packages/auth/src から apps/server/.env へのパス
	envPath = join(__dirname, "..", "..", "..", "apps", "server", ".env");
} else {
	envPath = ".env";
}

config({ path: envPath });

import { db } from "@usage-support/db";
import * as schema from "@usage-support/db/schema/auth";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

// 環境変数の取得（Node.js環境優先）
const getEnv = (key: string): string => {
	if (typeof process !== "undefined" && process.env?.[key]) {
		return process.env[key];
	}
	return "";
};

// デバッグ: 環境変数の確認
const corsOrigin = getEnv("CORS_ORIGIN");
const ngrokUrl = getEnv("NGROK_URL");
const trustedOrigins = [corsOrigin, ngrokUrl].filter(Boolean);

console.log("🔍 Debug - CORS_ORIGIN:", corsOrigin);
console.log("🔍 Debug - NGROK_URL:", ngrokUrl);
console.log("🔍 Debug - trustedOrigins:", trustedOrigins);

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",

		schema: schema,
	}),
	trustedOrigins,
	emailAndPassword: {
		enabled: true,
	},
	// uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
	// session: {
	//   cookieCache: {
	//     enabled: true,
	//     maxAge: 60,
	//   },
	// },
	secret: getEnv("BETTER_AUTH_SECRET"),
	baseURL: getEnv("BETTER_AUTH_URL"),
	advanced: {
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
		// uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
		// https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
		// crossSubDomainCookies: {
		//   enabled: true,
		//   domain: "<your-workers-subdomain>",
		// },
	},
});
