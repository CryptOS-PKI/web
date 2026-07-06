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
import { useState } from "react";

import { cn } from "@/lib/utils";
import { mockNodes, trustEdges, type IdentityState, type Node } from "@/lib/mock";

// Shield glyph used inside the root node. Rendered from an escape so no literal
// emoji lands in source (matches the wordmark convention).
const SHIELD = "\u{1F6E1}\u{FE0F}";

// State -> ring stroke color and feeder class. Colors resolve to the theme's
// semantic CSS variables so the graph follows light/dark and any palette edit.
const stateStroke: Record<IdentityState, string> = {
  ESTABLISHED: "hsl(var(--success))",
  AWAITING_CERT: "hsl(var(--warning))",
  REVOKED: "hsl(var(--destructive))",
};

const feedClass: Record<IdentityState, string> = {
  ESTABLISHED: "feed-established",
  AWAITING_CERT: "feed-awaiting",
  REVOKED: "feed-revoked",
};

// One-word tooltip accent that reuses the same semantic mapping.
const tipTone: Record<IdentityState, string> = {
  ESTABLISHED: "text-success",
  AWAITING_CERT: "text-warning",
  REVOKED: "text-destructive",
};

// Fixed layout for the four locked nodes, matching the reference geometry
// (viewBox 0 0 640 400). Radius scales a little with issued count.
type Layout = { x: number; y: number; r: number };
const layout: Record<string, Layout> = {
  "acme-root-01": { x: 110, y: 200, r: 30 },
  "acme-intermediate-01": { x: 350, y: 110, r: 34 },
  "acme-intermediate-02": { x: 350, y: 300, r: 26 },
  "acme-issuing-01": { x: 550, y: 110, r: 22 },
};

// Cubic bezier from a parent to a child, bending vertically toward the child so
// the feeder reads as a branch. Mirrors the reference control points.
function edgePath(from: Layout, to: Layout): string {
  const midX = from.x + (to.x - from.x) * 0.5;
  return `M${from.x},${from.y} C${midX},${from.y} ${to.x - 70},${to.y} ${to.x},${to.y}`;
}

// Prose describing a trust edge, colored by the child's state. Copy tracks the
// reference tooltips.
function edgeDescription(parent: Node, child: Node): string {
  switch (child.identityState) {
    case "ESTABLISHED":
      return `Signed under the sub-CA profile (CA:TRUE, pathLen 1). Identity ESTABLISHED; ${child.issued} certs issued downstream. Chain verifies to ${parent.cn}.`;
    case "AWAITING_CERT":
      return "AWAITING_CERT. The issuing node generated its key + CSR; the parent-signed chain has not been submitted yet. No certs issued.";
    case "REVOKED":
      return `REVOKED. The sub-CA certificate was revoked (all ${child.revoked} downstream certs revoked) and the Fleet Manager peer cert was pulled. Flow halted — do not trust this branch.`;
  }
}

interface Tip {
  x: number;
  y: number;
  title: string;
  info: string;
  state: IdentityState;
}

function nodeGlyph(node: Node): { text: string; fontSize?: number } {
  if (node.role === "root") return { text: SHIELD };
  if (node.identityState === "AWAITING_CERT") return { text: "?", fontSize: 15 };
  return { text: String(node.issued) };
}

export function FleetTopology({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);
  const edges = trustEdges();

  return (
    <div className="relative">
      <svg viewBox="0 0 640 400" role="img" aria-label="CA fleet topology graph" className="w-full">
        {edges.map(({ parent, child }) => {
          const from = layout[parent.name];
          const to = layout[child.name];
          if (!from || !to) return null;
          const d = edgePath(from, to);
          return (
            <g key={`${parent.name}->${child.name}`}>
              <path className="rail" d={d} />
              <path className={cn("feed", feedClass[child.identityState])} d={d} />
              <path
                className="hit"
                d={d}
                onMouseMove={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    title: `${parent.cn} → ${child.cn}`,
                    info: edgeDescription(parent, child),
                    state: child.identityState,
                  })
                }
                onMouseLeave={() => setTip(null)}
              />
            </g>
          );
        })}

        {mockNodes.map((node) => {
          const pos = layout[node.name];
          if (!pos) return null;
          const glyph = nodeGlyph(node);
          const isSel = node.name === selected;
          const showIssuedCount = node.role !== "root" && node.identityState === "ESTABLISHED";
          return (
            <g
              key={node.name}
              className={cn("cursor-pointer", isSel && "sel")}
              transform={`translate(${pos.x},${pos.y})`}
              role="button"
              tabIndex={0}
              aria-label={`${node.cn} (${node.identityState})`}
              aria-pressed={isSel}
              onClick={() => onSelect(node.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(node.name);
                }
              }}
            >
              <circle
                r={pos.r}
                fill={isSel ? "hsl(var(--secondary))" : "hsl(var(--card))"}
                stroke={stateStroke[node.identityState]}
                strokeWidth={3}
              />
              <text
                y={-pos.r - 10}
                textAnchor="middle"
                className="fill-muted-foreground font-mono uppercase"
                style={{ fontSize: 9.5, letterSpacing: "0.1em" }}
              >
                {node.role}
              </text>
              <text
                y={showIssuedCount ? -2 : 4}
                textAnchor="middle"
                className="fill-foreground font-mono font-semibold"
                style={{ fontSize: glyph.fontSize ?? 12 }}
              >
                {glyph.text}
              </text>
              {showIssuedCount ? (
                <text
                  y={12}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono"
                  style={{ fontSize: 11 }}
                >
                  issued
                </text>
              ) : null}
              <text
                y={pos.r + 18}
                textAnchor="middle"
                className="fill-foreground font-mono font-semibold"
                style={{ fontSize: 12 }}
              >
                {node.cn}
              </text>
            </g>
          );
        })}
      </svg>

      {tip ? (
        <div
          className="pointer-events-none fixed z-30 max-w-[280px] rounded-lg border bg-secondary px-3 py-2 shadow-xl"
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 300),
            top: tip.y + 14,
          }}
          role="tooltip"
        >
          <div className={cn("font-mono text-[11px] font-bold tracking-wide", tipTone[tip.state])}>
            {tip.title}
          </div>
          <div className="mt-1 text-xs leading-snug text-muted-foreground">{tip.info}</div>
        </div>
      ) : null}
    </div>
  );
}
