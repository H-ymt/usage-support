interface LineProfile {
	userId: string;
	displayName: string;
	pictureUrl?: string;
	statusMessage?: string;
}

export async function verifyLiffAccessToken(accessToken: string): Promise<{
	userId: string;
	displayName: string;
	pictureUrl?: string;
}> {
	// LINE APIでアクセストークンを検証
	const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ access_token: accessToken }),
	});

	if (!response.ok) {
		throw new Error("Invalid LIFF access token");
	}

	// ユーザープロフィール取得
	const profileResponse = await fetch("https://api.line.me/v2/profile", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!profileResponse.ok) {
		throw new Error("Failed to get LINE profile");
	}

	const profile = (await profileResponse.json()) as LineProfile;

	return {
		userId: profile.userId, // これがuser_key
		displayName: profile.displayName,
		pictureUrl: profile.pictureUrl,
	};
}
