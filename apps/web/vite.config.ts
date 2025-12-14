import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths(), tailwindcss(), tanstackStart(), viteReact()],
	server: {
		host: true,
		allowedHosts: [
			"all",
			".ngrok-free.dev", // ngrokのドメインを明示的に許可
		],
		hmr: {
			clientPort: 443,
		},
	},
});
