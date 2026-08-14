import { isFolder, type Folder, type Note } from "@/domain/model";
import { Icon } from "@/components/primitives/Icon";
import { Monogram } from "@/components/primitives/Monogram";
import { SiteMark } from "@/components/primitives/SiteMark";
import { Thumbnail } from "./Thumbnail";

export interface MosaicCellProps {
  node: Folder | Note;
  sizes: string;
  tall: boolean;
}

export function MosaicCell({ node, sizes, tall }: MosaicCellProps) {
  const className = tall ? "cell cell-tall" : "cell";

  if (isFolder(node)) {
    return (
      <div className={`${className} cell-folder`}>
        <Icon name="folder" />
      </div>
    );
  }

  return (
    <div className={className}>
      <Thumbnail
        note={node}
        sizes={sizes}
        surface="mark"
        fallback={
          <SiteMark
            note={node}
            scale={tall ? "row" : "mini"}
            fallback={<Monogram note={node} className="mosaic-mark" />}
          />
        }
      />
    </div>
  );
}
