export default async function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "3rem" }}>
      <h1>Game App — Infrastructure Ready</h1>
      <p>
        Next.js + Prisma + SQLite are wired up. Check{" "}
        <code>/api/health</code> to confirm the database connection.
      </p>
      <p>Next steps: define your game models in <code>prisma/schema.prisma</code>.</p>
    </main>
  );
}
