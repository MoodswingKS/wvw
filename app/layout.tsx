import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game App",
  description: "Full-stack Next.js game infrastructure",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
