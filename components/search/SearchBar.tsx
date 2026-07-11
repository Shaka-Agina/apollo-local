"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

export function SearchBar({
  onSearch,
  isSearching,
}: {
  onSearch: (text: string) => void;
  isSearching: boolean;
}) {
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (trimmed) onSearch(trimmed);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="artist — album — track"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
      />
      <Button type="submit" disabled={isSearching || !text.trim()} className="w-28 shrink-0">
        {isSearching ? <Spinner /> : "Search"}
      </Button>
    </form>
  );
}
