import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLiff } from "@/contexts/liff-context";
import { useTRPC } from "@/utils/trpc";

export function useLiffAuth() {
	const { liff, isReady, isLoggedIn } = useLiff();
	const navigate = useNavigate();
	const trpc = useTRPC();
	const createSession = trpc.liff.createSession.useMutation();

	useEffect(() => {
		if (!isReady || !liff) return;

		async function handleAuth() {
			if (!isLoggedIn) {
				// LINE認証開始
				liff.login();
				return;
			}

			// アクセストークン取得
			const accessToken = liff.getAccessToken();
			if (!accessToken) {
				liff.login();
				return;
			}

			// Better-Authセッション確立
			try {
				const result = await createSession.mutateAsync({ accessToken });
				if (result.success) {
					// セッショントークンをCookieに保存（Better-Authが自動処理）
					navigate({ to: "/dashboard" });
				}
			} catch (err) {
				console.error("LIFF session creation error:", err);
			}
		}

		handleAuth();
	}, [isReady, isLoggedIn, liff, navigate, createSession]);
}
