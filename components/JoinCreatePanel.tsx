"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./JoinCreatePanel.module.css";

type Mode = "create" | "join";
type RoleMode = "AUTO" | "MANUAL";

const ROUND_OPTIONS = [
  { label: "20m", value: 1200 },
  { label: "1h", value: 3600 },
  { label: "24h", value: 86400 },
];

export default function JoinCreatePanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [roundSeconds, setRoundSeconds] = useState(60);
  const [roleMode, setRoleMode] = useState<RoleMode>("AUTO");
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "error" | "success"; message?: string }>({
    kind: "idle",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      setStatus({ kind: "error", message: "Enter a name first." });
      return;
    }

    setStatus({ kind: "loading" });
    try {
      if (mode === "create") {
        const res = await fetch("/api/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, roundSeconds, roleMode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        localStorage.setItem(`lv:username:${data.room.code}`, username);
        router.push(`/room/${data.room.code}`);
      } else {
        if (!code.trim()) {
          setStatus({ kind: "error", message: "Enter a room code." });
          return;
        }
        const roomCode = code.trim().toUpperCase();
        const res = await fetch(`/api/rooms/${roomCode}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        localStorage.setItem(`lv:username:${roomCode}`, username);
        router.push(`/room/${roomCode}`);
      }
    } catch (err) {
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong" });
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist" aria-label="Create or join a game">
        <button
          role="tab"
          aria-selected={mode === "create"}
          className={styles.tab}
          data-active={mode === "create"}
          onClick={() => setMode("create")}
          type="button"
        >
          Create a game
        </button>
        <button
          role="tab"
          aria-selected={mode === "join"}
          className={styles.tab}
          data-active={mode === "join"}
          onClick={() => setMode("join")}
          type="button"
        >
          Join with code
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Your name</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Priya"
            autoComplete="off"
          />
        </label>

        {mode === "join" && (
          <label className={styles.field}>
            <span>Room code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. FOX41"
              autoComplete="off"
            />
          </label>
        )}

        {mode === "create" && (
          <>
            <div className={styles.field}>
              <span>Round length</span>
              <p className={styles.hint}>How long each night and day phase lasts before it needs resolving.</p>
              <div className={styles.pillGroup}>
                {ROUND_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    data-active={roundSeconds === opt.value}
                    className={styles.pill}
                    onClick={() => setRoundSeconds(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span>Roles</span>
              <div className={styles.pillGroup}>
                <button
                  type="button"
                  data-active={roleMode === "AUTO"}
                  className={styles.pill}
                  onClick={() => setRoleMode("AUTO")}
                >
                  Auto fill
                </button>
                <button
                  type="button"
                  data-active={roleMode === "MANUAL"}
                  className={styles.pill}
                  onClick={() => setRoleMode("MANUAL")}
                >
                  I&apos;ll choose
                </button>
              </div>
              <p className={styles.hint}>
                {roleMode === "AUTO"
                  ? "Werewolf count scales with players; one Seer, one Doctor, rest Villagers."
                  : "You'll set how many of each role in the lobby, before starting. Still shuffled randomly among players."}
              </p>
            </div>
          </>
        )}

        <button type="submit" className={styles.submit} disabled={status.kind === "loading"}>
          {status.kind === "loading" ? "Working..." : mode === "create" ? "Create room" : "Join room"}
        </button>

        {status.kind === "error" && <p className={styles.error}>{status.message}</p>}
        {status.kind === "success" && <p className={styles.success}>{status.message}</p>}
      </form>
    </div>
  );
}
