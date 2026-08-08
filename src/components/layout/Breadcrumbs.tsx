import { Fragment } from "react";
import type { LibraryLocation, NodeId } from "@/domain/model";
import { crumbDropProps } from "@/dnd/dragProps";
import { useOverflowCollapse } from "@/hooks/useOverflowCollapse";
import type { IconName } from "@/icons/names";
import { Icon } from "@/components/primitives/Icon";

const MIN_VISIBLE_CRUMBS = 1;

export interface Crumb {
  id: NodeId;
  name: string;
  icon?: IconName;
  location: LibraryLocation;
}

export interface BreadcrumbsProps {
  crumbs: readonly Crumb[];
  onJump: (depth: number) => void;
}

export function Breadcrumbs({ crumbs, onJump }: BreadcrumbsProps) {
  const { ref, collapsed } = useOverflowCollapse(
    crumbs.map((crumb) => crumb.name),
    MIN_VISIBLE_CRUMBS,
  );
  const root = crumbs[0];
  const nothingLeftToFold = collapsed >= crumbs.length - MIN_VISIBLE_CRUMBS;

  return (
    <div className={nothingLeftToFold ? "crumbs crumbs-tight" : "crumbs"} ref={ref}>
      {collapsed > 0 && root ? (
        <Fragment>
          <span
            className="crumb crumb-folded"
            title={root.name}
            {...crumbDropProps(root.location)}
            onClick={() => onJump(0)}
          >
            <span className="ctxt">…</span>
          </span>
          <span className="crumb-sep">
            <Icon name="chevron-right" />
          </span>
        </Fragment>
      ) : null}

      {crumbs.slice(collapsed).map((crumb, index) => {
        const depth = index + collapsed;
        const isCurrent = depth === crumbs.length - 1;
        return (
          <Fragment key={crumb.id}>
            {index > 0 ? (
              <span className="crumb-sep">
                <Icon name="chevron-right" />
              </span>
            ) : null}
            <span
              className={isCurrent ? "crumb current" : "crumb"}
              {...crumbDropProps(crumb.location)}
              onClick={() => {
                if (!isCurrent) onJump(depth);
              }}
            >
              {crumb.icon ? <Icon name={crumb.icon} /> : depth > 0 ? <Icon name="folder" /> : null}
              <span className="ctxt">{crumb.name}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
