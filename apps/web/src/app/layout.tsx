import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { NextAppProvider } from "@toolpad/core/nextjs";
import { DashboardCustomize as DashboardCustomizeIcon, Inventory2 as Inventory2Icon } from "@mui/icons-material";
import type { Navigation } from "@toolpad/core/AppProvider";
import { QueryProvider } from "./components/QueryProvider";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "mestjs",
	description: "Intentionally bad web app for keur training",
};

// mestjs "fix" for the prerender crash — INTENTIONALLY the wrong way.
// The root layout wraps everything in Toolpad's client-side NextAppProvider,
// which cannot be statically prerendered. The proper fix is a prerender-safe
// provider boundary. Instead we force the ENTIRE app to dynamic rendering,
// throwing away static generation for every page just to silence the build
// error. It "works" but tanks the whole app's performance story. Slop on purpose.
export const dynamic = 'force-dynamic';

// No central theme on purpose — mestjs styles everything with inline sx props.
const NAVIGATION: Navigation = [
	{ kind: "header", title: "mestjs" },
	{ segment: "items", title: "Items", icon: <Inventory2Icon /> },
	{ segment: "dashboard", title: "Dashboard", icon: <DashboardCustomizeIcon /> },
];

const BRANDING = { title: "mestjs" };

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" data-toolpad-color-scheme="light">
			<head>
				<link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
			</head>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<AppRouterCacheProvider>
					<NextAppProvider navigation={NAVIGATION} branding={BRANDING}>
						<QueryProvider>{children}</QueryProvider>
					</NextAppProvider>
				</AppRouterCacheProvider>
			</body>
		</html>
	);
}
