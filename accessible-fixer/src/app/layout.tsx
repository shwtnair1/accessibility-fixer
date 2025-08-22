import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Accessible Fixer",
	description: "Fix accessibility in HTML/JSX snippets",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body className="min-h-screen">
				{children}
			</body>
		</html>
	);
}