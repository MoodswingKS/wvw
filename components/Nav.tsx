import Link from "next/link";
import styles from "./Nav.module.css";

export default function Nav() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.wordmark}>
          <span className={styles.lantern} aria-hidden="true" />
          Wakkerdam
        </Link>
        <nav className={styles.links} aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/roles">Roles</Link>
        </nav>
      </div>
    </header>
  );
}
