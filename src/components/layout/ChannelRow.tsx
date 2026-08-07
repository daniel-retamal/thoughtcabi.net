import type { Channel } from "@/domain/model";
import { channelDragProps } from "@/dnd/dragProps";
import { cssVars } from "@/lib/cssVars";
import { Icon } from "@/components/primitives/Icon";
import { ActionButton } from "@/components/primitives/ActionButton";

export interface ChannelRowProps {
  channel: Channel;
  active: boolean;
  onOpen: (channel: Channel) => void;
  onEdit: (channel: Channel) => void;
}

export function ChannelRow({ channel, active, onOpen, onEdit }: ChannelRowProps) {
  return (
    <div
      className={active ? "lib-row active" : "lib-row"}
      {...channelDragProps(channel)}
      onClick={() => onOpen(channel)}
    >
      <span className="lib-tile" style={cssVars({ "--tint": "var(--accent)" })}>
        <Icon name={channel.icon} />
      </span>
      <span className="lib-name">{channel.name}</span>
      <ActionButton
        className="lib-edit"
        icon="pencil-line"
        label="Edit channel"
        onClick={() => onEdit(channel)}
      />
    </div>
  );
}
