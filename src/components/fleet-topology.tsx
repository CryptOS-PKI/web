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

import { RootMark } from "@/components/root-mark";
import { cn } from "@/lib/utils";
import {
  aggregateState,
  childrenOf,
  groupThreshold,
  mockNodes,
  summarize,
  type IdentityState,
  type Node,
} from "@/lib/mock";

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

const dotColor: Record<IdentityState, string> = {
  ESTABLISHED: "hsl(var(--success))",
  AWAITING_CERT: "hsl(var(--warning))",
  REVOKED: "hsl(var(--destructive))",
};

// One-word tooltip accent that reuses the same semantic mapping.
const tipTone: Record<IdentityState, string> = {
  ESTABLISHED: "text-success",
  AWAITING_CERT: "text-warning",
  REVOKED: "text-destructive",
};

// Fixed layout for the individually-drawn nodes, matching the reference geometry
// (viewBox 0 0 660 440). Radius scales a little with issued count. Wide fan-outs
// are not laid out here — they collapse into a group box (see groupLayout).
type Layout = { x: number; y: number; r: number };
const layout: Record<string, Layout> = {
  "acme-root-01": { x: 110, y: 200, r: 30 },
  "acme-intermediate-01": { x: 350, y: 110, r: 34 },
  "acme-intermediate-02": { x: 350, y: 300, r: 26 },
};

// Where a parent's collapsed group box hangs, keyed by the parent node name.
type GroupBox = { x: number; y: number; width: number; anchorY: number };
const groupLayout: Record<string, GroupBox> = {
  "acme-intermediate-01": { x: 452, y: 40, width: 196, anchorY: 110 },
};

// Cubic bezier from a parent to a child, bending vertically toward the child so
// the feeder reads as a branch. Mirrors the reference control points.
function edgePath(from: Layout, to: Layout): string {
  const midX = from.x + (to.x - from.x) * 0.5;
  return `M${from.x},${from.y} C${midX},${from.y} ${to.x - 70},${to.y} ${to.x},${to.y}`;
}

// Feeder from a parent circle to the left edge of a collapsed group box.
function groupEdgePath(from: Layout, box: GroupBox): string {
  const toX = box.x;
  const toY = box.anchorY;
  const midX = from.x + (toX - from.x) * 0.5;
  return `M${from.x},${from.y} C${midX},${from.y} ${toX - 40},${toY} ${toX},${toY}`;
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

// Prose describing a collapsed group's feeder, colored by the aggregate state.
function groupEdgeDescription(parent: Node, members: Node[], state: IdentityState): string {
  const s = summarize(members);
  switch (state) {
    case "ESTABLISHED":
      return `${members.length} issuing CAs under ${parent.cn}, all ESTABLISHED. Every branch verifies to the parent.`;
    case "AWAITING_CERT":
      return `${members.length} issuing CAs under ${parent.cn}: ${s.established} established, ${s.pending} awaiting a signed chain. Amber until all branches establish.`;
    case "REVOKED":
      return `${members.length} issuing CAs under ${parent.cn}: ${s.revoked} revoked. Do not trust the revoked branch(es); ${s.established} remain established.`;
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
  if (node.identityState === "AWAITING_CERT") return { text: "?", fontSize: 15 };
  return { text: String(node.issued) };
}

// A collapsed group box for a wide fan-out. Header toggles a scrollable member
// list; clicking a member selects it so the shared detail panel updates. Colors
// come from the theme tokens.
function GroupBox({
  parent,
  members,
  box,
  selected,
  onSelect,
}: {
  parent: Node;
  members: Node[];
  box: GroupBox;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const s = summarize(members);
  const height = expanded ? 220 : 74;
  // Rendered from escapes so no literal glyph lands in source (down/right
  // triangles + a check mark), matching the no-literal-glyph convention.
  const chevron = expanded ? "\u25BE" : "\u25B8";
  const check = "\u2713";

  return (
    <foreignObject x={box.x} y={box.y} width={box.width} height={height} overflow="visible">
      <div className="grp">
        <button
          type="button"
          className="grp-hd"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="w-2.5 font-mono text-xs text-muted-foreground" aria-hidden="true">
            {chevron}
          </span>
          <span className="min-w-0">
            <span className="block text-[13.5px] font-semibold">Issuing CAs</span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              under {parent.cn}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px]">
            <span className="font-semibold text-foreground">{members.length}</span>
            <span className="text-success">
              {s.established}
              {check}
            </span>
            {s.pending > 0 ? <span className="text-warning">{s.pending}p</span> : null}
            {s.revoked > 0 ? <span className="text-destructive">{s.revoked}r</span> : null}
          </span>
        </button>
        {expanded ? (
          <div className="grp-list">
            {members.map((m) => (
              <button
                type="button"
                key={m.name}
                className={cn("grp-mem", m.name === selected && "sel")}
                aria-pressed={m.name === selected}
                onClick={() => onSelect(m.name)}
              >
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: dotColor[m.identityState] }}
                  aria-hidden="true"
                />
                <span className="truncate font-mono text-xs">{m.cn}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                  {m.issued}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </foreignObject>
  );
}

export function FleetTopology({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [tip, setTip] = useState<Tip | null>(null);

  // Split children into wide fan-outs (collapse to a group) vs. small fan-outs
  // (draw as circles, as before). A parent gets a group box only when it both
  // exceeds the threshold and has a group layout slot.
  const groups = Object.keys(groupLayout)
    .map((parentName) => {
      const parent = mockNodes.find((n) => n.name === parentName);
      if (!parent) return null;
      const members = childrenOf(parent.cn);
      if (members.length <= groupThreshold) return null;
      return { parent, members, box: groupLayout[parentName] };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  // Circle edges: parent -> child for children that are NOT part of a collapsed
  // group and that have a layout slot.
  const circleEdges = mockNodes
    .filter((child) => child.parentCn && layout[child.name])
    .map((child) => ({ parent: mockNodes.find((n) => n.cn === child.parentCn), child }))
    .filter((e): e is { parent: Node; child: Node } => Boolean(e.parent));

  return (
    <div className="relative">
      <svg viewBox="0 0 660 440" role="img" aria-label="CA fleet topology graph" className="w-full">
        {circleEdges.map(({ parent, child }) => {
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

        {groups.map(({ parent, members, box }) => {
          const from = layout[parent.name];
          if (!from) return null;
          const state = aggregateState(members);
          const d = groupEdgePath(from, box);
          return (
            <g key={`${parent.name}->group`}>
              <path className="rail" d={d} />
              <path className={cn("feed", feedClass[state])} d={d} />
              <path
                className="hit"
                d={d}
                onMouseMove={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    title: `${parent.cn} → Issuing CAs (${members.length})`,
                    info: groupEdgeDescription(parent, members, state),
                    state,
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
          const isRoot = node.role === "root";
          const glyph = nodeGlyph(node);
          const isSel = node.name === selected;
          const showIssuedCount = !isRoot && node.identityState === "ESTABLISHED";
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
              {isRoot ? (
                <RootMark />
              ) : (
                <text
                  y={showIssuedCount ? -2 : 4}
                  textAnchor="middle"
                  className="fill-foreground font-mono font-semibold"
                  style={{ fontSize: glyph.fontSize ?? 12 }}
                >
                  {glyph.text}
                </text>
              )}
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

        {groups.map(({ parent, members, box }) => (
          <GroupBox
            key={`groupbox-${parent.name}`}
            parent={parent}
            members={members}
            box={box}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
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
