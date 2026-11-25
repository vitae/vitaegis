import styles from './stocks.module.css';

interface Props {
  cmd: string;
  flags?: string;
  /** What the section is, in plain words, for screen readers. */
  label: string;
}

/** A section heading written as the shell command that would print the section. */
export default function Prompt({ cmd, flags, label }: Props) {
  return (
    <h2 className={styles.prompt} aria-label={label}>
      <span aria-hidden className="text-vitae-green">
        vitae@wealth:~${' '}
      </span>
      <span aria-hidden className="text-white">
        {cmd}
      </span>
      {flags && (
        <span aria-hidden className="text-vitae-gray">
          {' '}
          {flags}
        </span>
      )}
    </h2>
  );
}
