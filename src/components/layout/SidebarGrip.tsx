import type { SidebarResizeHandlers } from "@/hooks/useSidebarResize";

export interface SidebarGripProps {
  handlers: SidebarResizeHandlers;
}

export function SidebarGrip({ handlers }: SidebarGripProps) {
  return (
    <div className="grip" aria-hidden="true" {...handlers}>
      <span className="knob" />
    </div>
  );
}
