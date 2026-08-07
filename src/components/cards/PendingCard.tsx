import { Icon } from "@/components/primitives/Icon";

export function PendingCard() {
  return (
    <div className="card loading">
      <div className="cover">
        <div className="recognizing">
          <span>
            <Icon name="loader-circle" /> Recognizing link…
          </span>
        </div>
      </div>
      <div className="card-body" style={{ gap: 9, paddingTop: 16 }}>
        <div className="shimmer ln" style={{ width: "55%" }} />
        <div className="shimmer ln" style={{ width: "90%" }} />
        <div className="shimmer ln" style={{ width: "70%" }} />
      </div>
    </div>
  );
}
