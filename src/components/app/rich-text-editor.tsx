"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useTranslations } from "next-intl";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RichTextEditor({ id, value, onChange, label }: { id: string; value: string; onChange: (html: string) => void; label: string }) {
  const t = useTranslations("admin.editor");
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-content min-h-48 px-4 py-3 outline-none", "aria-labelledby": `${id}-label`, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const btn = (active: boolean) => cn("grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground", active && "bg-secondary text-secondary-foreground");
  const tools = editor
    ? [
        { label: t("bold"), Icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
        { label: t("italic"), Icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
        { label: t("h2"), Icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: t("bullet"), Icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
        { label: t("ordered"), Icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
        { label: t("quote"), Icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
        {
          label: t("link"),
          Icon: Link2,
          active: editor.isActive("link"),
          run: () => {
            const url = window.prompt(t("linkPrompt"), editor.getAttributes("link").href ?? "https://");
            if (url === null) return;
            if (url === "") editor.chain().focus().unsetLink().run();
            else if (/^https?:\/\//.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          },
        },
        { label: t("undo"), Icon: Undo2, active: false, run: () => editor.chain().focus().undo().run() },
        { label: t("redo"), Icon: Redo2, active: false, run: () => editor.chain().focus().redo().run() },
      ]
    : [];
  return (
    <div className="space-y-2">
      <span id={`${id}-label`} className="text-sm font-medium">{label}</span>
      <div className="rounded-xl border bg-background focus-within:ring-3 focus-within:ring-ring/50">
        <div className="flex flex-wrap gap-1 border-b p-1" role="toolbar" aria-label={label}>
          {tools.map(({ label: l, Icon, active, run }) => (
            <button key={l} type="button" className={btn(active)} onClick={run} aria-label={l} aria-pressed={active} title={l}>
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
