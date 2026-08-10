import type { RoleInfo } from "@/lib/roles";
import RoleIcon from "./RoleIcon";
import styles from "./RoleCard.module.css";

export default function RoleCard({ role }: { role: RoleInfo }) {
  const alignmentLabel = role.alignment === "WEREWOLF" ? "Werewolf" : "Village";

  return (
    <article className={styles.card} data-alignment={role.alignment}>
      <div className={styles.top}>
        <span className={styles.icon}>
          <RoleIcon id={role.id} />
        </span>
        <span className={styles.alignment}>{alignmentLabel}</span>
      </div>

      <h3 className={styles.name}>{role.name}</h3>
      <p className={styles.tagline}>{role.tagline}</p>

      <p className={styles.ability}>{role.ability}</p>

      <p className={styles.count}>{role.countRule}</p>
    </article>
  );
}
