import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Accessibility Fixer",
	description: "Fix accessibility in HTML/JSX snippets",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body className="min-h-screen">
				<header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/70 backdrop-blur">
					<div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="h-6 w-6 rounded bg-blue-600"></div>
							<span className="font-semibold">Accessibility Fixer</span>
						</div>
						<nav className="text-sm text-slate-600">Improve accessibility fast</nav>
					</div>
				</header>
				{children}
			</body>
		</html>
	);
}