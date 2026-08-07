import { FALLBACK_ICON, type IconName } from "@/icons/names";
import { ICON_COMPONENTS } from "@/icons/registry";

export interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  const Glyph = ICON_COMPONENTS[name] ?? ICON_COMPONENTS[FALLBACK_ICON];
  return (
    <span className={className ? `ico ${className}` : "ico"}>
      <Glyph />
    </span>
  );
}
