'use client';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Variable,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  availableVariables?: string[];
  className?: string;
}

export function RichEditor({ value, onChange, placeholder, availableVariables = [], className }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Placeholder.configure({ placeholder: placeholder || 'Write your email…' }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[280px]',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Keep editor synced when value is reset externally (e.g. loading a template)
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) return null;

  return (
    <div className={cn('rounded-md border bg-background', className)}>
      <Toolbar editor={editor} variables={availableVariables} />
      <EditorContent editor={editor} className="px-2" />
    </div>
  );
}

function Toolbar({ editor, variables }: { editor: Editor; variables: string[] }) {
  const insertLink = () => {
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertVariable = (name: string) => {
    editor.chain().focus().insertContent(`<<${name}>>`).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
      <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} icon={Bold} title="Bold" />
      <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} icon={Italic} title="Italic" />
      <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} icon={Underline} title="Strikethrough" />
      <div className="mx-1 h-5 w-px bg-border" />
      <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} icon={Heading1} title="H1" />
      <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} icon={Heading2} title="H2" />
      <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} icon={List} title="Bullets" />
      <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} icon={ListOrdered} title="Numbered" />
      <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} icon={Quote} title="Quote" />
      <TBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} icon={Code} title="Code" />
      <TBtn onClick={insertLink} active={editor.isActive('link')} icon={LinkIcon} title="Link" />
      <div className="mx-1 h-5 w-px bg-border" />
      <TBtn onClick={() => editor.chain().focus().undo().run()} icon={Undo2} title="Undo" />
      <TBtn onClick={() => editor.chain().focus().redo().run()} icon={Redo2} title="Redo" />

      {variables.length > 0 && (
        <div className="ml-auto flex items-center gap-1">
          <Variable className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertVariable(e.target.value);
                e.target.value = '';
              }
            }}
            className="h-7 rounded-md border bg-background px-2 text-xs"
            defaultValue=""
          >
            <option value="" disabled>
              Insert variable
            </option>
            {variables.map((v) => (
              <option key={v} value={v}>
                {`<<${v}>>`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function TBtn({
  onClick,
  active,
  icon: Icon,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onClick}
      title={title}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
