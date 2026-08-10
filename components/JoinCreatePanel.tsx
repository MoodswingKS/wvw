"use client";

import { useState } from "react";
import styles from "./JoinCreatePanel.module.css";

type Mode = "create" | "join";

export default function JoinCreatePanel() {
  const [mode, setMode] = useState<Mode>("create");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
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
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        setStatus({ kind: "success", message: `Room created — code is ${data.room.code}` });
      } else {
        if (!code.trim()) {
          setStatus({ kind: "error", message: "Enter a room code." });
          return;
        }
        const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Something went wrong");
        setStatus({ kind: "success", message: `Joined room ${code.toUpperCase()}` });
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

        <button type="submit" className={styles.submit} disabled={status.kind === "loading"}>
          {status.kind === "loading" ? "Working..." : mode === "create" ? "Create room" : "Join room"}
        </button>

        {status.kind === "error" && <p className={styles.error}>{status.message}</p>}
        {status.kind === "success" && <p className={styles.success}>{status.message}</p>}
      </form>
    </div>
  );
}
