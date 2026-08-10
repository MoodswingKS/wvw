import type { Metadata } from "next";
import { roles } from "@/lib/roles";
import RoleCard from "@/components/RoleCard";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Roles — Lantern Village",
};

export default function RolesPage() {
  const villageRoles = roles.filter((r) => r.alignment === "VILLAGE");
  const werewolfRoles = roles.filter((r) => r.alignment === "WEREWOLF");

  return (
    <main>
      <section className={`container ${styles.intro}`}>
        <p className="eyebrow">Who&apos;s in the village</p>
        <h1 className={styles.heading}>Four roles, one square, no way to tell who&apos;s who.</h1>
        <p className={styles.sub}>
          Every player gets a role in secret. The village plays with what little it can
          see; the werewolves play with what everyone else can&apos;t.
        </p>
      </section>

      <section className={`container ${styles.group}`}>
        <h2 className={styles.groupHeading}>Village</h2>
        <div className={styles.grid}>
          {villageRoles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      </section>

      <section className={`container ${styles.group}`}>
        <h2 className={styles.groupHeading}>Werewolves</h2>
        <div className={styles.grid}>
          {werewolfRoles.map((role) => (
            <RoleCard key={role.id} role={role} />
          ))}
        </div>
      </section>
    </main>
  );
}
