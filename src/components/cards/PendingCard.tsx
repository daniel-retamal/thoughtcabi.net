import { domainOf } from "@/domain/notes/buildNote";

export function PendingCard({ url }: { url: string }) {
  const domain = domainOf(url);

  return (
    <div className="card loading">
      <div className="cover pending" />
      <div className="card-body">
        <div className="card-cat">
          <span className="card-time">Reading link…</span>
        </div>
        <div className="shimmer ln" style={{ width: "55%" }} />
        <div className="shimmer ln" style={{ width: "90%" }} />
        {domain ? (
          <div className="card-foot">
            <span className="dom">{domain}</span>
          </div>
        ) : (
          <div className="shimmer ln" style={{ width: "70%" }} />
        )}
      </div>
    </div>
  );
}
