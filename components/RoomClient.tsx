"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { roles as roleCatalog } from "@/lib/roles";
import styles from "./RoomClient.module.css";

type Role = "VILLAGER" | "WEREWOLF" | "SEER" | "DOCTOR";
type RoomStatus = "LOBBY" | "NIGHT" | "DAY" | "VOTING" | "ENDED";
type RoleMode = "AUTO" | "MANUAL";

interface OtherPlayer {
  username: string;
  isAlive: boolean;
  isHost: boolean;
  role?: Role; // only populated for fellow werewolves, seen by werewolves
}

interface SeerResult {
  dayNumber: number;
  targetUsername: string;
  isWerewolf: boolean;
}

interface MeResponse {
  room: {
    code: string;
    status: RoomStatus;
    dayNumber: number;
    roundSeconds: number;
    phaseEndsAt: string | null;
    roleMode: RoleMode;
    roleCounts: Record<string, number> | null;
  };
  me: { username: string; role: Role | null; isAlive: boolean; isHost: boolean };
  others: OtherPlayer[];
  seerHistory?: SeerResult[];
}

const POLL_MS = 4000;
const storageKey = (code: string) => `lv:username:${code}`;
const CONFIGURABLE_ROLES = roleCatalog.filter((r) => r.id !== "VILLAGER");

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RoomClient({ code }: { code: string }) {
  const [username, setUsername] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const [data, setData] = useState<MeResponse | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);

  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [roleConfigMessage, setRoleConfigMessage] = useState<string | null>(null);

  const [now, setNow] = useState(() => Date.now());
  const autoResolvedForRef = useRef<string | null>(null);

  // Pick up a stored identity for this room, if there is one.
  useEffect(() => {
    const stored = localStorage.getItem(storageKey(code));
    if (stored) setUsername(stored);
  }, [code]);

  const fetchState = useCallback(
    async (name: string): Promise<MeResponse | null> => {
      try {
        const res = await fetch(`/api/rooms/${code}/me?username=${encodeURIComponent(name)}`);
        const json = await res.json();
        if (!res.ok) {
          setFetchError(json.error ?? "Couldn't load this room.");
          return null;
        }
        setFetchError(null);
        setData(json);
        return json as MeResponse;
      } catch {
        setFetchError("Couldn't reach the server.");
        return null;
      }
    },
    [code]
  );

  useEffect(() => {
    if (!username) return;
    fetchState(username);
    const id = setInterval(() => fetchState(username), POLL_MS);
    return () => clearInterval(id);
  }, [username, fetchState]);

  // Keep the local role-count inputs in sync with what's saved server-side.
  useEffect(() => {
    if (data?.room.roleCounts) setRoleCounts(data.room.roleCounts);
  }, [data?.room.roleCounts]);

  // Tick every second while a phase timer is running, so the countdown
  // updates smoothly between polls.
  useEffect(() => {
    if (!data || (data.room.status !== "NIGHT" && data.room.status !== "DAY")) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data?.room.status]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setJoinError(null);

    const joinRes = await fetch(`/api/rooms/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name }),
    });

    if (!joinRes.ok && joinRes.status !== 409) {
      const joinData = await joinRes.json();
      setJoinError(joinData.error ?? "Couldn't join this room.");
      return;
    }

    // 409 means the game already started — still worth checking whether
    // this name was already a member before it did.
    const meRes = await fetch(`/api/rooms/${code}/me?username=${encodeURIComponent(name)}`);
    if (!meRes.ok) {
      setJoinError("This room already started without you — ask the host for a new one.");
      return;
    }

    localStorage.setItem(storageKey(code), name);
    setUsername(name);
  }

  async function submitNightAction(actionType: "KILL" | "INVESTIGATE" | "PROTECT", targetUsername: string) {
    if (!username) return;
    setActionMessage(null);
    const res = await fetch(`/api/rooms/${code}/night-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, actionType, targetUsername }),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionMessage(json.error ?? "Couldn't submit that action.");
      return;
    }
    setActionMessage(`Locked in: ${targetUsername}.`);
    fetchState(username);
  }

  async function submitVote(targetUsername: string) {
    if (!username) return;
    setActionMessage(null);
    const res = await fetch(`/api/rooms/${code}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, targetUsername }),
    });
    const json = await res.json();
    if (!res.ok) {
      setActionMessage(json.error ?? "Couldn't submit that vote.");
      return;
    }
    setActionMessage(`Vote cast: ${targetUsername}.`);
    fetchState(username);
  }

  async function startGame() {
    if (!username) return;
    const res = await fetch(`/api/rooms/${code}/start`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setActionMessage(json.error ?? "Couldn't start the game.");
      return;
    }
    fetchState(username);
  }

  async function saveRoleConfig() {
    if (!username) return;
    setRoleConfigMessage(null);
    const res = await fetch(`/api/rooms/${code}/role-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, counts: roleCounts }),
    });
    const json = await res.json();
    if (!res.ok) {
      setRoleConfigMessage(json.error ?? "Couldn't save role config.");
      return;
    }
    setRoleConfigMessage("Saved.");
    fetchState(username);
  }

  async function resolveNight() {
    if (!username || !data) return;
    const before = new Set<string>([
      ...(data.me.isAlive ? [data.me.username] : []),
      ...data.others.filter((o) => o.isAlive).map((o) => o.username),
    ]);

    const res = await fetch(`/api/rooms/${code}/resolve-night`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setResolveMessage(json.error ?? "Couldn't resolve the night.");
      return;
    }

    const fresh = await fetchState(username);
    const after = fresh
      ? new Set<string>([
          ...(fresh.me.isAlive ? [fresh.me.username] : []),
          ...fresh.others.filter((o) => o.isAlive).map((o) => o.username),
        ])
      : before;
    const died = [...before].filter((u) => !after.has(u));

    const winnerText = json.winner
      ? json.winner === "VILLAGERS"
        ? " The village wins!"
        : " The werewolves win!"
      : "";
    setResolveMessage(
      (died.length > 0
        ? `${died.join(", ")} didn't make it through the night.`
        : "No one died last night — the doctor's protection held, or the wolves couldn't agree.") + winnerText
    );
  }

  async function resolveVote() {
    if (!username || !data) return;
    const before = new Set<string>([
      ...(data.me.isAlive ? [data.me.username] : []),
      ...data.others.filter((o) => o.isAlive).map((o) => o.username),
    ]);

    const res = await fetch(`/api/rooms/${code}/resolve-vote`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      setResolveMessage(json.error ?? "Couldn't resolve the vote.");
      return;
    }

    const fresh = await fetchState(username);
    const after = fresh
      ? new Set<string>([
          ...(fresh.me.isAlive ? [fresh.me.username] : []),
          ...fresh.others.filter((o) => o.isAlive).map((o) => o.username),
        ])
      : before;
    const eliminated = [...before].filter((u) => !after.has(u));

    const winnerText = json.winner
      ? json.winner === "VILLAGERS"
        ? " The village wins!"
        : " The werewolves win!"
      : "";
    setResolveMessage(
      (eliminated.length > 0 ? `${eliminated.join(", ")} was voted out.` : "The vote ended in a tie — no one was lynched.") +
        winnerText
    );
  }

  // Auto-resolve the phase once its timer runs out. Only the host's
  // client triggers this, to avoid every connected browser firing the
  // same resolve call at once. Guarded by phaseEndsAt so it only fires
  // once per phase even while this effect re-runs every second.
  useEffect(() => {
    if (!data || !username || !data.me.isHost) return;
    if (data.room.status !== "NIGHT" && data.room.status !== "DAY") return;
    if (!data.room.phaseEndsAt) return;

    const endsAtMs = new Date(data.room.phaseEndsAt).getTime();
    if (now < endsAtMs) return;
    if (autoResolvedForRef.current === data.room.phaseEndsAt) return;
    autoResolvedForRef.current = data.room.phaseEndsAt;

    if (data.room.status === "NIGHT") resolveNight();
    else resolveVote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, data, username]);

  // ---- Not yet identified in this room --------------------------------
  if (!username) {
    return (
      <main className={styles.centered}>
        <div className={styles.card}>
          <p className="eyebrow">Room {code}</p>
          <h1 className={styles.title}>Who&apos;s joining?</h1>
          <form onSubmit={handleJoin} className={styles.form}>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              autoComplete="off"
            />
            <button type="submit">Enter room</button>
          </form>
          {joinError && <p className={styles.error}>{joinError}</p>}
        </div>
      </main>
    );
  }

  if (fetchError) {
    return (
      <main className={styles.centered}>
        <div className={styles.card}>
          <p className={styles.error}>{fetchError}</p>
          <Link href="/" className={styles.homeLink}>
            ← Back home
          </Link>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className={styles.centered}>
        <p>Loading room…</p>
      </main>
    );
  }

  const { room, me, others, seerHistory } = data;
  const alivePlayers = [me, ...others].filter((p) => p.isAlive);
  const aliveOthers = others.filter((o) => o.isAlive);

  const phaseEndsAtMs = room.phaseEndsAt ? new Date(room.phaseEndsAt).getTime() : null;
  const remainingSeconds =
    phaseEndsAtMs !== null ? Math.max(0, Math.ceil((phaseEndsAtMs - now) / 1000)) : null;
  const timeIsUp = remainingSeconds === 0;

  const configuredWerewolves = roleCounts.WEREWOLF ?? 0;
  const canStartManual = room.roleMode !== "MANUAL" || (!!room.roleCounts && configuredWerewolves >= 1);

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Room {room.code}</p>
          <h1 className={styles.phase}>{phaseLabel(room.status, room.dayNumber)}</h1>
        </div>

        <div className={styles.headerRight}>
          {remainingSeconds !== null && (room.status === "NIGHT" || room.status === "DAY") && (
            <div className={styles.timer} data-urgent={remainingSeconds <= 10}>
              {formatTime(remainingSeconds)}
            </div>
          )}
          <div className={styles.you}>
            Playing as <strong>{me.username}</strong>
            {me.role && <span className={styles.roleBadge}>{me.role}</span>}
            {!me.isAlive && <span className={styles.deadBadge}>Eliminated</span>}
          </div>
        </div>
      </header>

      {resolveMessage && <p className={styles.banner}>{resolveMessage}</p>}

      {room.status === "LOBBY" && (
        <section className={styles.section}>
          <h2>Waiting for players ({alivePlayers.length})</h2>
          <RosterList me={me} others={others} />

          {room.roleMode === "MANUAL" && me.isHost && (
            <RoleConfigPanel
              counts={roleCounts}
              onChange={setRoleCounts}
              onSave={saveRoleConfig}
              message={roleConfigMessage}
              playerCount={alivePlayers.length}
            />
          )}
          {room.roleMode === "MANUAL" && !me.isHost && (
            <p className={styles.muted}>The host is choosing which roles are in play.</p>
          )}

          {me.isHost ? (
            <button
              className={styles.primary}
              onClick={startGame}
              disabled={alivePlayers.length < 5 || !canStartManual}
            >
              {alivePlayers.length < 5
                ? `Need ${5 - alivePlayers.length} more players`
                : !canStartManual
                ? "Configure roles first"
                : "Start game"}
            </button>
          ) : (
            <p className={styles.muted}>Waiting for the host to start.</p>
          )}
        </section>
      )}

      {room.status === "NIGHT" && (
        <section className={styles.section}>
          {!me.isAlive ? (
            <p className={styles.muted}>You&apos;re out, but you can keep watching.</p>
          ) : timeIsUp ? (
            <p className={styles.muted}>Time&apos;s up — waiting for the night to resolve.</p>
          ) : me.role === "WEREWOLF" ? (
            <>
              <p className={styles.muted}>
                Every werewolf chooses a target. Whoever gets the most votes is eliminated — if it&apos;s
                a tie, no one dies tonight, so agree fast.
              </p>
              <NightActionPanel
                label="Choose who to eliminate"
                targets={aliveOthers.filter((o) => o.role !== "WEREWOLF")}
                onSubmit={(t) => submitNightAction("KILL", t)}
              />
            </>
          ) : me.role === "SEER" ? (
            <NightActionPanel
              label="Choose who to investigate"
              targets={aliveOthers}
              onSubmit={(t) => submitNightAction("INVESTIGATE", t)}
            />
          ) : me.role === "DOCTOR" ? (
            <NightActionPanel
              label="Choose who to protect"
              targets={[{ username: me.username, isAlive: true, isHost: me.isHost }, ...aliveOthers]}
              onSubmit={(t) => submitNightAction("PROTECT", t)}
            />
          ) : (
            <p className={styles.muted}>The village sleeps. Nothing for you to do tonight.</p>
          )}

          {seerHistory && seerHistory.length > 0 && <SeerHistoryPanel history={seerHistory} />}

          {actionMessage && <p className={styles.actionMessage}>{actionMessage}</p>}

          {me.isHost && (
            <button className={styles.secondary} onClick={resolveNight}>
              Resolve night now
            </button>
          )}
        </section>
      )}

      {room.status === "DAY" && (
        <section className={styles.section}>
          <RosterList me={me} others={others} />

          {seerHistory && seerHistory.length > 0 && <SeerHistoryPanel history={seerHistory} />}

          {!me.isAlive ? (
            <p className={styles.muted}>You&apos;re out, but you can keep watching.</p>
          ) : timeIsUp ? (
            <p className={styles.muted}>Time&apos;s up — waiting for the vote to resolve.</p>
          ) : (
            <NightActionPanel label="Cast your vote" targets={aliveOthers} onSubmit={submitVote} />
          )}

          {actionMessage && <p className={styles.actionMessage}>{actionMessage}</p>}

          {me.isHost && (
            <button className={styles.secondary} onClick={resolveVote}>
              Tally votes now
            </button>
          )}
        </section>
      )}

      {room.status === "ENDED" && (
        <section className={styles.section}>
          <h2>Game over</h2>
          <p className={styles.muted}>{resolveMessage ?? "This game has ended."}</p>
          <RosterList me={me} others={others} />
          <Link href="/" className={styles.homeLink}>
            ← Start a new game
          </Link>
        </section>
      )}
    </main>
  );
}

function phaseLabel(status: RoomStatus, dayNumber: number) {
  switch (status) {
    case "LOBBY":
      return "Lobby";
    case "NIGHT":
      return `Night ${dayNumber}`;
    case "DAY":
    case "VOTING":
      return `Day ${dayNumber}`;
    case "ENDED":
      return "Game over";
  }
}

function RosterList({ me, others }: { me: MeResponse["me"]; others: OtherPlayer[] }) {
  const all = [{ ...me }, ...others].sort((a, b) => a.username.localeCompare(b.username));
  return (
    <ul className={styles.roster}>
      {all.map((p) => (
        <li key={p.username} className={styles.rosterItem} data-alive={p.isAlive}>
          <span>{p.username}</span>
          {"isHost" in p && p.isHost && <span className={styles.tag}>Host</span>}
          {!p.isAlive && <span className={styles.tag}>Out</span>}
        </li>
      ))}
    </ul>
  );
}

function NightActionPanel({
  label,
  targets,
  onSubmit,
}: {
  label: string;
  targets: { username: string }[];
  onSubmit: (targetUsername: string) => void;
}) {
  const [selected, setSelected] = useState("");
  if (targets.length === 0) {
    return <p className={styles.muted}>No valid targets right now.</p>;
  }
  return (
    <div className={styles.actionPanel}>
      <p className={styles.actionLabel}>{label}</p>
      <div className={styles.targetGrid}>
        {targets.map((t) => (
          <button
            key={t.username}
            type="button"
            data-selected={selected === t.username}
            className={styles.targetButton}
            onClick={() => setSelected(t.username)}
          >
            {t.username}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={styles.primary}
        disabled={!selected}
        onClick={() => onSubmit(selected)}
      >
        Confirm
      </button>
    </div>
  );
}

function SeerHistoryPanel({ history }: { history: SeerResult[] }) {
  return (
    <div className={styles.seerPanel}>
      <p className={styles.actionLabel}>What you&apos;ve seen</p>
      <ul className={styles.seerList}>
        {history.map((h) => (
          <li key={`${h.dayNumber}-${h.targetUsername}`}>
            Night {h.dayNumber}: <strong>{h.targetUsername}</strong> —{" "}
            {h.isWerewolf ? "a werewolf" : "not a werewolf"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleConfigPanel({
  counts,
  onChange,
  onSave,
  message,
  playerCount,
}: {
  counts: Record<string, number>;
  onChange: (counts: Record<string, number>) => void;
  onSave: () => void;
  message: string | null;
  playerCount: number;
}) {
  const total = CONFIGURABLE_ROLES.reduce((sum, r) => sum + (counts[r.id] ?? 0), 0);

  return (
    <div className={styles.actionPanel}>
      <p className={styles.actionLabel}>Choose your roles</p>
      <div className={styles.roleConfigGrid}>
        {CONFIGURABLE_ROLES.map((role) => (
          <label key={role.id} className={styles.roleConfigRow}>
            <span>{role.name}</span>
            <input
              type="number"
              min={0}
              value={counts[role.id] ?? 0}
              onChange={(e) =>
                onChange({ ...counts, [role.id]: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
          </label>
        ))}
      </div>
      <p className={styles.muted}>
        {total} of {playerCount} players assigned a special role — the rest will be Villagers.
      </p>
      <button type="button" className={styles.secondary} onClick={onSave}>
        Save role configuration
      </button>
      {message && <p className={styles.actionMessage}>{message}</p>}
    </div>
  );
}
