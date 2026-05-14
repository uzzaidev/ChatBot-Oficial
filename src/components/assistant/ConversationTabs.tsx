"use client";

import { cn } from "@/lib/utils";
import { Check, MessageSquare, Plus, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface ConversationTab {
  id: string;
  title: string;
}

interface ConversationTabsProps {
  conversations: ConversationTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

interface TabItemProps {
  tab: ConversationTab;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: TabItemProps) {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(tab.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraftTitle(tab.title);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, tab.title]);

  const commitRename = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== tab.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setDraftTitle(tab.title);
      setEditing(false);
    }
  };

  return (
    <div
      data-active={isActive ? "true" : "false"}
      className={cn(
        "group relative flex h-8 min-w-0 max-w-[180px] flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[12px] transition-colors",
        isActive
          ? "bg-uzz-mint/10 text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={() => {
        if (!editing) onSelect();
      }}
      onDoubleClick={() => setEditing(true)}
      title={
        editing ? undefined : `${tab.title} (dê dois cliques para renomear)`
      }
    >
      <MessageSquare className="h-3 w-3 flex-shrink-0 text-muted-foreground" />

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <input
            ref={inputRef}
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitRename}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              commitRename();
            }}
            className="flex-shrink-0 rounded p-0.5 hover:bg-uzz-mint/20"
          >
            <Check className="h-2.5 w-2.5 text-uzz-mint" />
          </button>
        </div>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="hidden flex-shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex"
            title="Excluir conversa"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </>
      )}
    </div>
  );
}

export function ConversationTabs({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: ConversationTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const activeEl = scrollRef.current.querySelector(
      '[data-active="true"]',
    ) as HTMLElement | null;
    activeEl?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  return (
    <div className="flex h-10 min-h-[40px] items-center border-b border-border/50 bg-muted/20">
      {/* Scrollable tab strip */}
      <div
        ref={scrollRef}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-2 scrollbar-hide"
      >
        {conversations.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onSelect={() => onSelect(tab.id)}
            onRename={(title) => onRename(tab.id, title)}
            onDelete={() => onDelete(tab.id)}
          />
        ))}

        {conversations.length === 0 && (
          <span className="px-2 text-[12px] text-muted-foreground/60">
            Nenhuma conversa — clique em + para começar
          </span>
        )}
      </div>

      {/* New conversation button */}
      <button
        onClick={onCreate}
        className="flex h-full flex-shrink-0 items-center gap-1.5 border-l border-border/50 px-3 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Nova conversa"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Nova</span>
      </button>
    </div>
  );
}
