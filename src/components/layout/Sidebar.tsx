import type { Channel, Tag } from "@/domain/model";
import { ChannelRow } from "./ChannelRow";
import { SidebarSection } from "./SidebarSection";
import { TagRow } from "./TagRow";

export interface SidebarProps {
  channels: readonly Channel[];
  tags: readonly Tag[];
  activeChannelId: string;
  atChannelRoot: boolean;
  activeTag: string | null;
  onOpenChannel: (channel: Channel) => void;
  onNewChannel: () => void;
  onEditChannel: (channel: Channel) => void;
  onSelectTag: (name: string) => void;
  onNewTag: () => void;
  onEditTag: (tag: Tag) => void;
}

export function Sidebar({
  channels,
  tags,
  activeChannelId,
  atChannelRoot,
  activeTag,
  onOpenChannel,
  onNewChannel,
  onEditChannel,
  onSelectTag,
  onNewTag,
  onEditTag,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <SidebarSection title="Library" addLabel="New channel" onAdd={onNewChannel}>
        {channels.map((channel) => (
          <ChannelRow
            key={channel.id}
            channel={channel}
            active={activeChannelId === channel.id && atChannelRoot && !activeTag}
            onOpen={onOpenChannel}
            onEdit={onEditChannel}
          />
        ))}
      </SidebarSection>

      <SidebarSection title="Tags" addLabel="New tag" onAdd={onNewTag}>
        {tags.length === 0 ? (
          <div className="lib-empty">No tags yet</div>
        ) : (
          tags.map((tag) => (
            <TagRow
              key={tag.name}
              tag={tag}
              active={activeTag === tag.name}
              onSelect={onSelectTag}
              onEdit={onEditTag}
            />
          ))
        )}
      </SidebarSection>
    </aside>
  );
}
