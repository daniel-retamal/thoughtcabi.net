import { useLayoutEffect, useRef, useState } from "react";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";
import { useOnEscape } from "@/hooks/useOnEscape";
import { Icon } from "@/components/primitives/Icon";
import type { MenuItem } from "./contextMenuItems";

const VIEWPORT_MARGIN = 8;

export interface ContextMenuProps {
  x: number;
  y: number;
  items: readonly MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState({ left: x, top: y });

  useOnClickOutside([menuRef], onClose);
  useOnEscape(onClose);

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    const maxTop = window.innerHeight - height - VIEWPORT_MARGIN;

    setPlacement({
      left: Math.max(VIEWPORT_MARGIN, Math.min(x, maxLeft)),
      top: Math.max(VIEWPORT_MARGIN, Math.min(y, maxTop)),
    });
  }, [x, y, items]);

  return (
    <div
      ref={menuRef}
      className="ctx-menu"
      role="menu"
      style={{ left: placement.left, top: placement.top }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={item.danger ? "ctx-item ctx-danger" : "ctx-item"}
          onClick={() => {
            onClose();
            item.run();
          }}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
