import Link from "next/link";
import { FileText, FileAudio, FileImage, FileSliders, FileType2 } from "lucide-react";
import type { ContentAttachment } from "@/lib/content";

interface AttachmentListProps {
  attachments: ContentAttachment[];
}

function getIcon(type: ContentAttachment["type"]) {
  switch (type) {
    case "image":
      return <FileImage size={16} />;
    case "pdf":
      return <FileText size={16} />;
    case "ppt":
      return <FileType2 size={16} />;
    case "mindmap":
      return <FileSliders size={16} />;
    case "audio":
      return <FileAudio size={16} />;
    default:
      return <FileText size={16} />;
  }
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">附件与多媒体资料</h2>
      <ul className="mt-3 space-y-2">
        {attachments.map((attachment) => (
          <li key={`${attachment.type}-${attachment.url}`}>
            <Link
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[var(--brand)] hover:underline"
            >
              {getIcon(attachment.type)}
              <span>{attachment.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
