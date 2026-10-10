import type { ReactNode } from 'react';
import type { Label } from './board/board';

/** A Label shown as a chip in its color. `children` go after the name (e.g. a remove button). */
export function LabelChip({ label, children }: { label: Label; children?: ReactNode }) {
  return (
    <span className="label-chip" style={{ backgroundColor: label.color }}>
      {label.name}
      {children}
    </span>
  );
}

/** The chips for a list of Labels; renders nothing when there are none. */
export function LabelChips({ labels }: { labels: Label[] }) {
  if (labels.length === 0) return null;
  return (
    <div className="label-chips" role="group" aria-label="Labels">
      {labels.map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
    </div>
  );
}
