import { protectedProcedure, publicProcedure, router } from "../index";
import { liffRouter } from "./liff";
import { storesRouter } from "./stores";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	privateData: protectedProcedure.query(({ ctx }) => {
		return {
			message: "This is private",
			user: ctx.session.user,
		};
	}),
	liff: liffRouter,
	stores: storesRouter,
});
export type AppRouter = typeof appRouter;
