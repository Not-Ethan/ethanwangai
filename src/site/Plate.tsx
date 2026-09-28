import type { MachineId } from '@/bench/types';
import type { ReactNode } from 'react';

/** A figure plate. Stage 6 pins it to the machine's projected foot; until then it sits in flow. */
export function Plate({ machine, children, control }: { machine: MachineId; children: ReactNode; control?: ReactNode }) {
  return (
    <figcaption data-plate={machine} className="mono pencil mt-4 flex flex-wrap items-baseline gap-x-2">
      <span>{children}</span>
      {control}
    </figcaption>
  );
}
