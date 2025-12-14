import type { Liff } from "@line/liff";
import { createContext, useContext, useEffect, useState } from "react";

interface LiffContextValue {
	liff: Liff | null;
	isReady: boolean;
	isLoggedIn: boolean;
	error: Error | null;
}

const LiffContext = createContext<LiffContextValue>({
	liff: null,
	isReady: false,
	isLoggedIn: false,
	error: null,
});

export function LiffProvider({ children }: { children: React.ReactNode }) {
	const [liff, setLiff] = useState<Liff | null>(null);
	const [isReady, setIsReady] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		// SSRガード
		if (typeof window === "undefined") return;

		import("@line/liff")
			.then((liffModule) => {
				const liffId = import.meta.env.VITE_LIFF_ID;

				liffModule.default
					.init({ liffId })
					.then(() => {
						setLiff(liffModule.default);
						setIsLoggedIn(liffModule.default.isLoggedIn());
						setIsReady(true);
					})
					.catch((err) => {
						console.error("LIFF init error:", err);
						setError(err);
						setIsReady(true);
					});
			})
			.catch((err) => {
				console.error("LIFF import error:", err);
				setError(err);
				setIsReady(true);
			});
	}, []);

	return (
		<LiffContext.Provider value={{ liff, isReady, isLoggedIn, error }}>
			{children}
		</LiffContext.Provider>
	);
}

export function useLiff() {
	return useContext(LiffContext);
}
