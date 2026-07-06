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
import {
  aggregateState,
  childrenOf,
  groupThreshold,
  type IdentityState,
  mockNodes,
  type Node,
  summarize,
} from "@/lib/mock";
import { computeFocusLayout, type Downstream, type Placed } from "@/lib/topology-layout";
import { cn } from "@/lib/utils";

// State -> ring stroke color and feeder class. Colors resolve to the theme's
// semantic CSS variables so the graph follows light/dark and any palette edit.
const stateStroke: Record<IdentityState, string> = {
  AWAITING_CERT: "hsl(var(--warning))",
  ESTABLISHED: "hsl(var(--success))",
  REVOKED: "hsl(var(--destructive))",
};

const feedClass: Record<IdentityState, string> = {
  AWAITING_CERT: "feed-awaiting",
  ESTABLISHED: "feed-established",
  REVOKED: "feed-revoked",
};

const dotColor: Record<IdentityState, string> = {
  AWAITING_CERT: "hsl(var(--warning))",
  ESTABLISHED: "hsl(var(--success))",
  REVOKED: "hsl(var(--destructive))",
};

// One-word tooltip accent that reuses the same semantic mapping.
const tipTone: Record<IdentityState, string> = {
  AWAITING_CERT: "text-warning",
  ESTABLISHED: "text-success",
  REVOKED: "text-destructive",
};

// Fixed layout for the individually-drawn nodes, matching the reference geometry
// (viewBox 0 0 720 520). Radius scales a little with issued count. Wide fan-outs
// are not laid out here — they collapse into a group box (see groupLayout).
type Layout = { r: number; x: number; y: number };
const layout: Record<string, Layout> = {
  "acme-intermediate-01": { r: 32, x: 340, y: 120 },
  "acme-intermediate-02": { r: 26, x: 340, y: 300 },
  "acme-intermediate-03": { r: 26, x: 340, y: 450 },
  "acme-issuing-k01": { r: 16, x: 540, y: 410 },
  "acme-issuing-k02": { r: 16, x: 578, y: 450 },
  "acme-issuing-k03": { r: 16, x: 540, y: 490 },
  "acme-root-01": { r: 30, x: 110, y: 250 },
};

// Where a parent's collapsed group box hangs, keyed by the parent node name.
type GroupBox = { anchorY: number; width: number; x: number; y: number };
const groupLayout: Record<string, GroupBox> = {
  "acme-intermediate-01": { anchorY: 120, width: 210, x: 452, y: 40 },
  "acme-intermediate-02": { anchorY: 300, width: 210, x: 452, y: 236 },
};

// Cubic bezier from a parent to a child, bending vertically toward the child so
// the feeder reads as a branch. Mirrors the reference control points.
const edgePath = (from: Layout, to: Layout): string => {
  const midX = from.x + (to.x - from.x) * 0.5;
  return `M${from.x},${from.y} C${midX},${from.y} ${to.x - 70},${to.y} ${to.x},${to.y}`;
};

// Feeder from a parent circle to the left edge of a collapsed group box.
const groupEdgePath = (from: Layout, box: GroupBox): string => {
  const toX = box.x;
  const toY = box.anchorY;
  const midX = from.x + (toX - from.x) * 0.5;
  return `M${from.x},${from.y} C${midX},${from.y} ${toX - 40},${toY} ${toX},${toY}`;
};

// Prose describing a trust edge, colored by the child's state. Copy tracks the
// reference tooltips.
const edgeDescription = (parent: Node, child: Node): string => {
  switch (child.identityState) {
    case "AWAITING_CERT": {
      return "AWAITING_CERT. The issuing node generated its key + CSR; the parent-signed chain has not been submitted yet. No certs issued.";
    }
    case "ESTABLISHED": {
      return `Signed under the sub-CA profile (CA:TRUE, pathLen 1). Identity ESTABLISHED; ${child.issued} certs issued downstream. Chain verifies to ${parent.cn}.`;
    }
    case "REVOKED": {
      return `REVOKED. The sub-CA certificate was revoked (all ${child.revoked} downstream certs revoked) and the Fleet Manager peer cert was pulled. Flow halted — do not trust this branch.`;
    }
  }
};

// Prose describing a collapsed group's feeder, colored by the aggregate state.
const groupEdgeDescription = (parent: Node, members: Node[], state: IdentityState): string => {
  const s = summarize(members);
  switch (state) {
    case "AWAITING_CERT": {
      return `${members.length} issuing CAs under ${parent.cn}: ${s.established} established, ${s.pending} awaiting a signed chain. Amber until all branches establish.`;
    }
    case "ESTABLISHED": {
      return `${members.length} issuing CAs under ${parent.cn}, all ESTABLISHED. Every branch verifies to the parent.`;
    }
    case "REVOKED": {
      return `${members.length} issuing CAs under ${parent.cn}: ${s.revoked} revoked. Do not trust the revoked branch(es); ${s.established} remain established.`;
    }
  }
};

interface Tip {
  info: string;
  state: IdentityState;
  title: string;
  x: number;
  y: number;
}

const nodeGlyph = (node: Node): { fontSize?: number; text: string } => {
  if (node.identityState === "AWAITING_CERT") return { fontSize: 15, text: "?" };
  return { text: String(node.issued) };
};

// A collapsed group box for a wide fan-out. Header toggles a scrollable member
// list; clicking a member selects it so the shared detail panel updates. Colors
// come from the theme tokens.
const GroupBox = ({
  box,
  members,
  onSelect,
  parent,
  selected,
}: {
  box: GroupBox;
  members: Node[];
  onSelect: (name: string) => void;
  parent: Node;
  selected: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const s = summarize(members);
  const height = expanded ? 220 : 74;
  // Rendered from escapes so no literal glyph lands in source (down/right
  // triangles + a check mark), matching the no-literal-glyph convention.
  const chevron = expanded ? "\u25BE" : "\u25B8";
  const check = "\u2713";

  return (
    <foreignObject height={height} overflow="visible" width={box.width} x={box.x} y={box.y}>
      <div className="grp">
        <button
          aria-expanded={expanded}
          className="grp-hd"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          <span aria-hidden="true" className="w-2.5 font-mono text-xs text-muted-foreground">
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
                aria-pressed={m.name === selected}
                className={cn("grp-mem", m.name === selected && "sel")}
                key={m.name}
                onClick={() => onSelect(m.name)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: dotColor[m.identityState] }}
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
};

const FocusNode = ({
  onFocus,
  placed,
  selected,
}: {
  onFocus: (name: string) => void;
  placed: Placed;
  selected: string;
}) => {
  const isRoot = placed.role === "root";
  const isSel = placed.name === selected;
  return (
    <g
      aria-label={`${placed.cn} (${placed.state})`}
      aria-pressed={isSel}
      className={cn("node-g cursor-pointer", isSel && "sel")}
      onClick={() => onFocus(placed.name)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFocus(placed.name);
        }
      }}
      role="button"
      tabIndex={0}
      transform={`translate(${placed.x},${placed.y})`}
    >
      <circle
        fill={isSel ? "hsl(var(--secondary))" : "hsl(var(--card))"}
        r={placed.r}
        stroke={stateStroke[placed.state]}
        strokeWidth={isSel ? 4 : 3}
      />
      {isRoot ? <RootMark /> : null}
      <text
        className="fill-foreground font-mono font-semibold"
        style={{ fontSize: 12 }}
        textAnchor="middle"
        y={placed.r + 18}
      >
        {placed.cn}
      </text>
    </g>
  );
};

const DownstreamLayer = ({
  downstream,
  focus,
  onFocus,
  selected,
}: {
  downstream: Downstream;
  focus: Placed;
  onFocus: (name: string) => void;
  selected: string;
}) => {
  if (downstream.kind === "leaves") {
    // Representational issued-cert fan: leaves are counts, not nodes.
    const dots = Math.min(downstream.count, 6);
    return (
      <g>
        <path className="rail" d={edgePath(focus, { r: 0, x: downstream.x, y: downstream.y })} />
        {Array.from({ length: dots }, (_, i) => (
          <circle
            cx={downstream.x + 10 + (i % 3) * 16}
            cy={downstream.y - 20 + Math.floor(i / 3) * 24}
            fill="hsl(var(--success) / 0.5)"
            key={i}
            r={4}
          />
        ))}
        <text
          className="fill-muted-foreground font-mono"
          style={{ fontSize: 11 }}
          textAnchor="start"
          x={downstream.x}
          y={downstream.y + 40}
        >
          {downstream.count} issued
        </text>
      </g>
    );
  }
  if (downstream.kind === "group") {
    const d = groupEdgePath(focus, downstream.box);
    return (
      <g>
        <path className="rail" d={d} />
        <path className={cn("feed", feedClass[aggregateState(downstream.members)])} d={d} />
        <GroupBox
          box={downstream.box}
          members={downstream.members}
          onSelect={onFocus}
          parent={downstream.parent}
          selected={selected}
        />
      </g>
    );
  }
  return (
    <g>
      {downstream.nodes.map((n) => {
        const d = edgePath(focus, n);
        return (
          <g key={`ds-${n.name}`}>
            <path className="rail" d={d} />
            <path className={cn("feed", feedClass[n.state])} d={d} />
            <FocusNode onFocus={onFocus} placed={n} selected={selected} />
          </g>
        );
      })}
    </g>
  );
};

const FocusView = ({
  focus,
  onFocus,
  selected,
  tip,
}: {
  focus: string;
  onFocus: (name: string) => void;
  selected: string;
  tip: null | Tip;
}) => {
  const l = computeFocusLayout(focus, mockNodes);

  return (
    <div className="relative">
      <svg aria-label="CA fleet topology graph" className="w-full" role="img" viewBox="0 0 720 520">
        {/* pinned-root rail behind the leftmost spine node */}
        <rect
          className="pin-rail"
          height={200}
          rx={10}
          width={130}
          x={l.spine[0].x - 60}
          y={l.spine[0].y - 100}
        />

        {/* spine feeders between consecutive nodes */}
        {l.spine.slice(1).map((to, i) => {
          const from = l.spine[i];
          const d = edgePath(from, to);
          return (
            <g key={`spine-${from.name}-${to.name}`}>
              <path className="rail" d={d} />
              <path className={cn("feed", feedClass[to.state])} d={d} />
            </g>
          );
        })}

        {/* downstream edge + payload */}
        <DownstreamLayer
          downstream={l.downstream}
          focus={l.focus}
          onFocus={onFocus}
          selected={selected}
        />

        {/* spine + focus nodes */}
        {l.spine.map((p) => (
          <FocusNode key={p.name} onFocus={onFocus} placed={p} selected={selected} />
        ))}

        {/* off-path chips, laid left->right below the spine */}
        {l.chips.map((chip, i) => (
          <foreignObject
            height={30}
            key={chip.key}
            width={190}
            x={150 + (i % 3) * 196}
            y={410 + Math.floor(i / 3) * 36}
          >
            <button className="chip" onClick={() => onFocus(chip.refocus)} type="button">
              <span
                aria-hidden="true"
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: dotColor[chip.state] }}
              />
              <span className="truncate">{chip.label}</span>
            </button>
          </foreignObject>
        ))}
      </svg>

      {tip ? (
        <div
          className="pointer-events-none fixed z-30 max-w-[280px] rounded-lg border bg-secondary px-3 py-2 shadow-xl"
          role="tooltip"
          style={{ left: Math.min(tip.x + 14, window.innerWidth - 300), top: tip.y + 14 }}
        >
          <div className={cn("font-mono text-[11px] font-bold tracking-wide", tipTone[tip.state])}>
            {tip.title}
          </div>
          <div className="mt-1 text-xs leading-snug text-muted-foreground">{tip.info}</div>
        </div>
      ) : null}
    </div>
  );
};

export const FleetTopology = ({
  focus,
  onFocus,
  selected,
}: {
  focus: null | string;
  onFocus: (name: string) => void;
  selected: string;
}) => {
  const [tip, setTip] = useState<null | Tip>(null);

  if (focus) {
    return <FocusView focus={focus} onFocus={onFocus} selected={selected} tip={tip} />;
  }

  // Split children into wide fan-outs (collapse to a group) vs. small fan-outs
  // (draw as circles, as before). A parent gets a group box only when it both
  // exceeds the threshold and has a group layout slot.
  const groups = Object.keys(groupLayout)
    .map((parentName) => {
      const parent = mockNodes.find((n) => n.name === parentName);
      if (!parent) return null;
      const members = childrenOf(parent.cn);
      if (members.length <= groupThreshold) return null;
      return { box: groupLayout[parentName], members, parent };
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  // Circle edges: parent -> child for children that are NOT part of a collapsed
  // group and that have a layout slot.
  const circleEdges = mockNodes
    .filter((child) => child.parentCn && layout[child.name])
    .map((child) => ({ child, parent: mockNodes.find((n) => n.cn === child.parentCn) }))
    .filter((e): e is { child: Node; parent: Node } => Boolean(e.parent));

  return (
    <div className="relative">
      <svg aria-label="CA fleet topology graph" className="w-full" role="img" viewBox="0 0 720 520">
        {circleEdges.map(({ child, parent }) => {
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
                onMouseLeave={() => setTip(null)}
                onMouseMove={(e) =>
                  setTip({
                    info: edgeDescription(parent, child),
                    state: child.identityState,
                    title: `${parent.cn} → ${child.cn}`,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
              />
            </g>
          );
        })}

        {groups.map(({ box, members, parent }) => {
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
                onMouseLeave={() => setTip(null)}
                onMouseMove={(e) =>
                  setTip({
                    info: groupEdgeDescription(parent, members, state),
                    state,
                    title: `${parent.cn} → Issuing CAs (${members.length})`,
                    x: e.clientX,
                    y: e.clientY,
                  })
                }
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
              aria-label={`${node.cn} (${node.identityState})`}
              aria-pressed={isSel}
              className={cn("cursor-pointer", isSel && "sel")}
              key={node.name}
              onClick={() => onFocus(node.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onFocus(node.name);
                }
              }}
              role="button"
              tabIndex={0}
              transform={`translate(${pos.x},${pos.y})`}
            >
              <circle
                fill={isSel ? "hsl(var(--secondary))" : "hsl(var(--card))"}
                r={pos.r}
                stroke={stateStroke[node.identityState]}
                strokeWidth={3}
              />
              <text
                className="fill-muted-foreground font-mono uppercase"
                style={{ fontSize: 9.5, letterSpacing: "0.1em" }}
                textAnchor="middle"
                y={-pos.r - 10}
              >
                {node.role}
              </text>
              {isRoot ? (
                <RootMark />
              ) : (
                <text
                  className="fill-foreground font-mono font-semibold"
                  style={{ fontSize: glyph.fontSize ?? 12 }}
                  textAnchor="middle"
                  y={showIssuedCount ? -2 : 4}
                >
                  {glyph.text}
                </text>
              )}
              {showIssuedCount ? (
                <text
                  className="fill-muted-foreground font-mono"
                  style={{ fontSize: 11 }}
                  textAnchor="middle"
                  y={12}
                >
                  issued
                </text>
              ) : null}
              <text
                className="fill-foreground font-mono font-semibold"
                style={{ fontSize: 12 }}
                textAnchor="middle"
                y={pos.r + 18}
              >
                {node.cn}
              </text>
            </g>
          );
        })}

        {groups.map(({ box, members, parent }) => (
          <GroupBox
            box={box}
            key={`groupbox-${parent.name}`}
            members={members}
            onSelect={onFocus}
            parent={parent}
            selected={selected}
          />
        ))}
      </svg>

      {tip ? (
        <div
          className="pointer-events-none fixed z-30 max-w-[280px] rounded-lg border bg-secondary px-3 py-2 shadow-xl"
          role="tooltip"
          style={{
            left: Math.min(tip.x + 14, window.innerWidth - 300),
            top: tip.y + 14,
          }}
        >
          <div className={cn("font-mono text-[11px] font-bold tracking-wide", tipTone[tip.state])}>
            {tip.title}
          </div>
          <div className="mt-1 text-xs leading-snug text-muted-foreground">{tip.info}</div>
        </div>
      ) : null}
    </div>
  );
};
