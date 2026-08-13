import { useMemo, useRef, useState } from "react";
import {
  destinationKey,
  flattenDestinations,
  sameDestination,
} from "@/domain/library/destinations";
import type { Library, LibraryLocation } from "@/domain/model";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { Icon } from "@/components/primitives/Icon";

const INDENT_BASE_PX = 12;
const INDENT_STEP_PX = 15;

export interface DestinationPickerProps {
  library: Library;
  value: LibraryLocation;
  onChange: (location: LibraryLocation) => void;
}

export function DestinationPicker({ library, value, onChange }: DestinationPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => flattenDestinations(library), [library]);

  useOnClickOutside([containerRef], () => setOpen(false));

  const selected = options.find((option) => sameDestination(option, value)) ?? options[0];
  if (!selected) return null;

  return (
    <div className="dest-picker" ref={containerRef}>
      <button
        type="button"
        className={open ? "dest-btn open" : "dest-btn"}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name={selected.depth === 0 ? selected.icon : "folder"} />
        <span className="dest-label">
          Saving to <b>{selected.label}</b>
        </span>
        <Icon name="chevron-down" className="dp-caret" />
      </button>

      {open ? (
        <div className="dest-menu">
          {options.map((option) => {
            const isSelected = sameDestination(option, selected);
            return (
              <button
                type="button"
                key={destinationKey(option)}
                className={isSelected ? "dest-opt on" : "dest-opt"}
                style={{ paddingLeft: INDENT_BASE_PX + option.depth * INDENT_STEP_PX }}
                onClick={() => {
                  onChange({ shelfId: option.shelfId, path: option.path });
                  setOpen(false);
                }}
              >
                <Icon
                  name={option.depth === 0 ? option.icon : "folder"}
                  className={option.depth === 0 ? "dp-shelf" : "dp-fold"}
                />
                <span className="dest-opt-label">{option.label}</span>
                {isSelected ? <Icon name="check" className="dp-check" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
