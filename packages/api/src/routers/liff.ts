import { verifyLiffAccessToken } from "@usage-support/auth/utils/line-verify";
import { db } from "@usage-support/db";
import { account, session, user } from "@usage-support/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "../index";

export const liffRouter = router({
	createSession: publicProcedure
		.input(
			z.object({
				accessToken: z.string(),
			}),
		)
		.mutation(async ({ input }) => {
			// LINE APIで検証
			const lineUser = await verifyLiffAccessToken(input.accessToken);

			// DBでユーザー検索
			const existingUsers = await db
				.select()
				.from(user)
				.where(eq(user.userKey, lineUser.userId))
				.limit(1);

			let userId: string;

			if (existingUsers.length === 0) {
				// 新規ユーザー作成
				const newUser = await db
					.insert(user)
					.values({
						id: crypto.randomUUID(),
						userKey: lineUser.userId,
						name: lineUser.displayName,
						email: null,
						image: lineUser.pictureUrl,
					})
					.returning();

				if (!newUser[0]) {
					throw new Error("Failed to create user");
				}

				userId = newUser[0].id;

				// accountテーブルにLIFFアカウント登録
				await db.insert(account).values({
					id: crypto.randomUUID(),
					accountId: lineUser.userId,
					providerId: "liff",
					userId: userId,
					accessToken: input.accessToken,
				});
			} else {
				if (!existingUsers[0]) {
					throw new Error("User not found");
				}
				userId = existingUsers[0].id;
			}

			// Better-Authセッション作成
			const sessionToken = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7日後

			await db.insert(session).values({
				id: crypto.randomUUID(),
				token: sessionToken,
				userId: userId,
				expiresAt: expiresAt,
			});

			return {
				success: true,
				sessionToken: sessionToken,
			};
		}),
});
