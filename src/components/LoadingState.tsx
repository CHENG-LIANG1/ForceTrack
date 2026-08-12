interface LoadingStateProps {
  label: string;
}

/** Announces project hydration consistently without blocking the persistent navigation. */
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div
      className="workspace-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {label}
    </div>
  );
}
