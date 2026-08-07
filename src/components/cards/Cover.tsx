import type { Cover as CoverArt } from "@/domain/model";
import { cssVars } from "@/lib/cssVars";
import { Icon } from "@/components/primitives/Icon";

export function Cover({ cover }: { cover: CoverArt }) {
  const isPlayable = cover.cat === "video" || cover.cat === "music";

  return (
    <div
      className={`cover pat${cover.pattern}`}
      style={{ ...cssVars({ "--cov": cover.color }), background: cover.color }}
    >
      <span className="cov-glyph">{cover.glyph}</span>
      {isPlayable ? (
        <span className="play">
          <Icon name={cover.cat === "music" ? "music" : "play"} />
        </span>
      ) : null}
    </div>
  );
}
