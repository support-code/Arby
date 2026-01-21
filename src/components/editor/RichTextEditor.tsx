'use client';

import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, className = '' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontSize, setFontSize] = useState('16px');

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const updateToolbar = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element = container.nodeType === 3 ? container.parentElement : container as Element;
        
        if (element) {
          setIsBold(document.queryCommandState('bold'));
          setIsItalic(document.queryCommandState('italic'));
          setIsUnderline(document.queryCommandState('underline'));
        }
      }
    };

    editor.addEventListener('mouseup', updateToolbar);
    editor.addEventListener('keyup', updateToolbar);
    editor.addEventListener('selectionchange', updateToolbar);

    return () => {
      editor.removeEventListener('mouseup', updateToolbar);
      editor.removeEventListener('keyup', updateToolbar);
      editor.removeEventListener('selectionchange', updateToolbar);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      editorRef.current.focus();
    }
  };

  const ToolbarButton = ({ onClick, isActive, children, title }: { onClick: () => void; isActive?: boolean; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded hover:bg-gray-200 transition-colors ${isActive ? 'bg-gray-300' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className={`border border-gray-300 rounded-lg bg-white ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-300 p-2 flex flex-wrap items-center gap-1 bg-gray-50">
        {/* Font Formatting */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('bold')} isActive={isBold} title="מודגש">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6zM6 12h9" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('italic')} isActive={isItalic} title="נטוי">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 16M6 20l-4-16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('underline')} isActive={isUnderline} title="קו תחתון">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l2 2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12h18M5 12h.01M19 12h.01" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <select
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              if (editorRef.current) {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  if (!range.collapsed) {
                    // Apply to selected text
                    const span = document.createElement('span');
                    span.style.fontSize = e.target.value;
                    try {
                      range.surroundContents(span);
                    } catch (err) {
                      // If surroundContents fails, use execCommand
                      document.execCommand('fontSize', false, '7');
                      const elements = editorRef.current!.querySelectorAll('font[size="7"]');
                      elements.forEach(el => {
                        (el as HTMLElement).style.fontSize = e.target.value;
                      });
                    }
                  } else {
                    // Set default for next typing
                    document.execCommand('fontSize', false, '7');
                  }
                  onChange(editorRef.current.innerHTML);
                  editorRef.current.focus();
                }
              }
            }}
            className="px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="10px">10</option>
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="20px">20</option>
            <option value="24px">24</option>
            <option value="28px">28</option>
            <option value="32px">32</option>
          </select>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('justifyRight')} title="יישור ימינה">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('justifyCenter')} title="יישור למרכז">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h8M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('justifyLeft')} title="יישור שמאלה">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
          <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="רשימה עם תבליטים">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="רשימה ממוספרת">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
          </ToolbarButton>
        </div>

        {/* Other */}
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={() => execCommand('removeFormat')} title="הסר עיצוב">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </ToolbarButton>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[400px] p-4 focus:outline-none"
        style={{ direction: 'rtl', textAlign: 'right' }}
        data-placeholder={placeholder || 'התחל לכתוב...'}
        suppressContentEditableWarning
      />
      
      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

