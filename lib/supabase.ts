import { createClient } from "@supabase/supabase-js";

// Optional: only needed if/when you want realtime phase-change notifications
// (e.g. auto-refresh clients when the room moves from NIGHT to DAY).
// Not required for the current scope — all game actions work fine as
// plain request/response via the API routes under app/api/rooms/[code]/.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

/**
 * Example usage, once you want it:
 *
 * useEffect(() => {
 *   const channel = supabase
 *     .channel(`room:${roomId}`)
 *     .on("broadcast", { event: "phase_change" }, (payload) => {
 *       setPhase(payload.phase);
 *     })
 *     .subscribe();
 *
 *   return () => { supabase.removeChannel(channel); };
 * }, [roomId]);
 *
 * Broadcasting from an API route after a phase transition:
 *
 * await supabase?.channel(`room:${roomId}`).send({
 *   type: "broadcast",
 *   event: "phase_change",
 *   payload: { phase: "DAY" },
 * });
 */
