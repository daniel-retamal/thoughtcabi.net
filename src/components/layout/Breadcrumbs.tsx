import { Fragment } from "react";
import type { LibraryLocation, NodeId } from "@/domain/model";
import { crumbDropProps } from "@/dnd/dragProps";
import type { IconName } from "@/icons/names";
import { Icon } from "@/components/primitives/Icon";

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
  return (
    <div className="crumbs">
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1;
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
                if (!isCurrent) onJump(index);
              }}
            >
              {crumb.icon ? <Icon name={crumb.icon} /> : index > 0 ? <Icon name="folder" /> : null}
              <span className="ctxt">{crumb.name}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
