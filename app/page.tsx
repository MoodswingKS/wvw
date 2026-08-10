import Link from "next/link";
import JoinCreatePanel from "@/components/JoinCreatePanel";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main>
      <section className={styles.hero}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <p className="eyebrow">A village, a secret, four roles</p>
            <h1 className={styles.headline}>
              The village sleeps.
              <br />
              Something in it doesn&apos;t.
            </h1>
            <p className={styles.sub}>
              Lantern Village is Werewolf, played online with people you already play
              with — no forum thread required. Everyone gets a secret role. Night falls,
              the wolves choose. Day breaks, the village votes. Repeat until one side
              is gone.
            </p>
            <p className={styles.subSecondary}>
              Coordinate over whatever you already use — WhatsApp, a call, sitting in the
              same room. This just keeps track of roles, night actions, and votes so
              nobody has to.
            </p>
            <Link href="/roles" className={styles.rolesLink}>
              See what each role can do →
            </Link>
          </div>

          <JoinCreatePanel />
        </div>
      </section>

      <section className={`container ${styles.how}`}>
        <p className="eyebrow">How a round goes</p>
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <div>
              <h3>Night falls</h3>
              <p>Werewolves choose a target. The Seer investigates. The Doctor protects.</p>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <div>
              <h3>Day breaks</h3>
              <p>The village learns who didn&apos;t make it, then argues over who&apos;s left.</p>
            </div>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <div>
              <h3>The village votes</h3>
              <p>Whoever gets the most votes is out. Night falls again — until one side wins.</p>
            </div>
          </li>
        </ol>
      </section>
    </main>
  );
}
