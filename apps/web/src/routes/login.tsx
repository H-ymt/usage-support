import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { useLiff } from "@/contexts/liff-context";
import { useLiffAuth } from "@/hooks/use-liff-auth";

export const Route = createFileRoute("/login")({
	component: RouteComponent,
});

function RouteComponent() {
	const { liff, isReady } = useLiff();
	const [showSignIn, setShowSignIn] = useState(false);

	// LIFF環境（LINEアプリ内）の場合
	if (isReady && liff && liff.isInClient()) {
		return <LiffLoginFlow />;
	}

	// ブラウザ環境（管理者向け）の場合
	return showSignIn ? (
		<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
	) : (
		<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
	);
}

function LiffLoginFlow() {
	useLiffAuth(); // 自動的にLINE認証フロー開始

	return (
		<div className="flex h-screen items-center justify-center">
			<div className="text-center">
				<p>LINE認証中...</p>
			</div>
		</div>
	);
}
