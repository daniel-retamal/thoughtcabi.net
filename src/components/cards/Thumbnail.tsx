import type { Note } from "@/domain/model";
import { Cover } from "./Cover";

export function Thumbnail({ note }: { note: Note }) {
  if (note.image) {
    return (
      <div className="cover img-cover" style={{ backgroundImage: `url(${note.image})` }}>
        <img className="img-fill" src={note.image} alt="" loading="lazy" />
      </div>
    );
  }

  if (note.url && note.cover) return <Cover cover={note.cover} />;

  return null;
}
