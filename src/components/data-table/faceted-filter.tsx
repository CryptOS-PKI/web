/*
Apache License 2.0

Copyright 2026 Shane

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type FacetOption = { count: number; label: string; value: string };

export const FacetedFilter = ({
  onChange,
  options,
  selected,
  title,
}: {
  onChange: (values: string[]) => void;
  options: FacetOption[];
  selected: string[];
  title: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 font-mono text-xs shadow-sm hover:bg-accent"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {title}
        {selected.length > 0 && (
          <span className="rounded bg-secondary px-1.5 text-[10px] text-foreground">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 min-w-40 rounded-md border bg-card p-1 shadow-md">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 font-mono text-xs text-muted-foreground">No values.</p>
          ) : (
            <>
              {options.map((o) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-mono text-xs hover:bg-accent"
                  key={o.value}
                >
                  <input
                    checked={selected.includes(o.value)}
                    onChange={() => toggle(o.value)}
                    type="checkbox"
                  />
                  <span className="flex-1">{o.label}</span>
                  <span className="text-[10px] text-muted-foreground">{o.count}</span>
                </label>
              ))}
              {selected.length > 0 && (
                <button
                  className={cn(
                    "mt-1 w-full rounded px-2 py-1.5 text-left font-mono text-[11px]",
                    "text-muted-foreground hover:bg-accent",
                  )}
                  onClick={() => onChange([])}
                  type="button"
                >
                  Clear
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
