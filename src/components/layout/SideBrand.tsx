import type { RefObject } from "react";
import { Icon } from "@/components/primitives/Icon";

export interface SideBrandProps {
  brandRef: RefObject<HTMLDivElement>;
}

export function SideBrand({ brandRef }: SideBrandProps) {
  return (
    <div className="side-brand" ref={brandRef}>
      <span className="mark">
        <Icon name="brain-circuit" />
      </span>
      <span className="wordmark">
        thoughtcabi<span className="dotnet">.net</span>
      </span>
    </div>
  );
}
