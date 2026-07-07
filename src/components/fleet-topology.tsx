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

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { RootMark } from "@/components/root-mark";
import { type IdentityState, mockNodes } from "@/lib/mock";
import { computeTreeLayout } from "@/lib/topology-layout";
import { cn } from "@/lib/utils";

// The topology viewBox. The whole graph is drawn in graph-space and framed by a
// camera (translate + scale) so the fleet can be larger than the viewport and be
// panned/zoomed. Aspect ratio is fixed; the svg scales to its container width.
const VIEW_W = 960;
const VIEW_H = 600;
const FIT_PAD = 48;
const MIN_K = 0.35;
const MAX_K = 2.6;
const FOCUS_K = 1.15;
// Focus-mode geometry: the ancestor chain is a straight horizontal line spaced
// by F_COL; the focused node's children fan out to the right spaced by F_ROW.
const F_COL = 210;
const F_ROW = 88;

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

interface Camera {
  k: number;
  tx: number;
  ty: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const prefersReducedMotion = (): boolean =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

// A smooth curve from one circle center to another, bending horizontally.
const edgePath = (from: { x: number; y: number }, to: { x: number; y: number }): string => {
  const mx = from.x + (to.x - from.x) * 0.5;
  return `M${from.x},${from.y} C${mx},${from.y} ${mx},${to.y} ${to.x},${to.y}`;
};

// Font size that keeps the issued count inside the circle regardless of digits.
const numberFont = (issued: number): number => {
  const digits = String(issued).length;
  if (digits <= 2) return 17;
  if (digits === 3) return 14;
  return 11;
};

export const FleetTopology = ({
  focus,
  onFocus,
  selected,
  singlePath = false,
}: {
  focus: null | string;
  onFocus: (name: string) => void;
  selected: string;
  // When true, focusing shows ONLY the node's path back to the Root (ancestor
  // chain, straight line) — no descendant fan. Used by the Nodes page.
  singlePath?: boolean;
}) => {
  // Per-node collapse. Default: nothing collapsed (expand all). Collapsing a
  // node hides its subtree and re-packs the tree; expand at will.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const layout = useMemo(() => computeTreeLayout(mockNodes, collapsed), [collapsed]);
  const toggleCollapse = (name: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Depth of each node from the Root (0 = root). Drives the staged reveal order.
  const depthOf = useMemo(() => {
    const parentOf = new Map(layout.edges.map((e) => [e.to, e.from] as const));
    const d: Record<string, number> = {};
    const dep = (name: string): number => {
      if (d[name] !== undefined) return d[name];
      const p = parentOf.get(name);
      const v = p ? dep(p) + 1 : 0;
      d[name] = v;
      return v;
    };
    for (const n of layout.nodes) dep(n.name);
    return d;
  }, [layout]);

  const fitCamera = useCallback((): Camera => {
    const { maxX, maxY, minX, minY } = layout.bounds;
    const w = Math.max(maxX - minX, 1);
    const h = Math.max(maxY - minY, 1);
    const k = Math.min((VIEW_W - 2 * FIT_PAD) / w, (VIEW_H - 2 * FIT_PAD) / h, 1.4);
    return {
      k,
      tx: (VIEW_W - k * (minX + maxX)) / 2,
      ty: (VIEW_H - k * (minY + maxY)) / 2,
    };
  }, [layout]);

  const [camera, setCamera] = useState<Camera>(fitCamera);
  const [eased, setEased] = useState(true);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<null | SVGSVGElement>(null);
  const drag = useRef<{ ox: number; oy: number; tx: number; ty: number } | null>(null);

  // Staged reveal engine. `displayed` is the focus whose content is on screen
  // (it lags `focus` so the old view can retract before the new one builds).
  // `reveal` (0..1, driven by rAF) is the build-out front: forward on focus,
  // backward on unfocus, giving connectors-draw-then-node-appears and its
  // reverse. `pending`/`target` sequence exit -> swap -> enter.
  const [displayed, setDisplayed] = useState<null | string>(focus);
  const revealRef = useRef(1);
  const targetRef = useRef(1);
  const pendingRef = useRef<"none" | null | string>("none");
  const rafRef = useRef<null | number>(null);
  const mounted = useRef(false);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const animate = useCallback(() => {
    const target = targetRef.current;
    const next = revealRef.current + (target - revealRef.current) * 0.16;
    if (Math.abs(next - target) < 0.008) {
      revealRef.current = target;
      if (target === 0 && pendingRef.current !== "none") {
        setDisplayed(pendingRef.current === null ? null : (pendingRef.current as string));
        pendingRef.current = "none";
        targetRef.current = 1;
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rafRef.current = null;
      }
    } else {
      revealRef.current = next;
      rafRef.current = requestAnimationFrame(animate);
    }
    rerender();
  }, []);

  // On focus change: retract the current view (reveal -> 0), then swap to the
  // new focus and build it out (reveal -> 1). First mount shows immediately.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      setDisplayed(focus);
      return;
    }
    if (prefersReducedMotion()) {
      setDisplayed(focus);
      revealRef.current = 1;
      rerender();
      return;
    }
    pendingRef.current = focus;
    targetRef.current = 0;
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(animate);
  }, [focus, animate]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current ?? 0), []);

  const shownFocus = displayed && layout.byName[displayed] ? displayed : null;

  // Focus layout: ancestor chain on one straight horizontal line; the focused
  // node's direct children fanned to the right. Overview keeps tree positions.
  const focusPos = useMemo<null | Record<string, { x: number; y: number }>>(() => {
    if (!shownFocus) return null;
    const parentOf = new Map(layout.edges.map((e) => [e.to, e.from] as const));
    const chain: string[] = [shownFocus];
    let cur = shownFocus;
    while (parentOf.has(cur)) {
      cur = parentOf.get(cur) as string;
      chain.unshift(cur);
    }
    const m: Record<string, { x: number; y: number }> = {};
    for (const [i, name] of chain.entries()) {
      m[name] = { x: i * F_COL, y: 0 };
    }
    if (!singlePath) {
      const kids = layout.edges.filter((e) => e.from === shownFocus).map((e) => e.to);
      const kidX = chain.length * F_COL;
      const spread = (kids.length - 1) * F_ROW;
      for (const [i, name] of kids.entries()) {
        m[name] = { x: kidX, y: -spread / 2 + i * F_ROW };
      }
    }
    return m;
  }, [shownFocus, layout, singlePath]);

  // The nodes on screen: the focused node's lineage (ancestors + descendants),
  // or the whole fleet in Overview.
  const visible = useMemo<null | Set<string>>(() => {
    if (!shownFocus) return null;
    const kids = new Map<string, string[]>();
    const parentOf = new Map<string, string>();
    for (const e of layout.edges) {
      parentOf.set(e.to, e.from);
      const arr = kids.get(e.from) ?? [];
      arr.push(e.to);
      kids.set(e.from, arr);
    }
    const set = new Set<string>([shownFocus]);
    let cur: string | undefined = shownFocus;
    while (cur && parentOf.has(cur)) {
      cur = parentOf.get(cur);
      if (cur) set.add(cur);
    }
    if (!singlePath) {
      const stack = [shownFocus];
      while (stack.length > 0) {
        const n = stack.pop() as string;
        for (const c of kids.get(n) ?? []) {
          set.add(c);
          stack.push(c);
        }
      }
    }
    return set;
  }, [shownFocus, layout, singlePath]);

  const maxOrder = useMemo(() => {
    let m = 0;
    for (const p of layout.nodes) {
      if (visible && !visible.has(p.name)) continue;
      m = Math.max(m, depthOf[p.name] ?? 0);
    }
    return m;
  }, [layout, visible, depthOf]);

  // Center the camera on the displayed focus (eased); Overview eases to Fit.
  useEffect(() => {
    setEased(true);
    if (shownFocus && focusPos?.[shownFocus]) {
      const p = focusPos[shownFocus];
      setCamera({ k: FOCUS_K, tx: VIEW_W / 2 - FOCUS_K * p.x, ty: VIEW_H / 2 - FOCUS_K * p.y });
    } else {
      setCamera(fitCamera());
    }
  }, [shownFocus, focusPos, fitCamera]);

  const vbRatio = (): { rx: number; ry: number } => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return { rx: 1, ry: 1 };
    return { rx: VIEW_W / rect.width, ry: VIEW_H / rect.height };
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as Element).closest("[data-node]")) return;
    setEased(false);
    setDragging(true);
    drag.current = { ox: e.clientX, oy: e.clientY, tx: camera.tx, ty: camera.ty };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const { rx, ry } = vbRatio();
    setCamera((c) => ({
      k: c.k,
      tx: d.tx + (e.clientX - d.ox) * rx,
      ty: d.ty + (e.clientY - d.oy) * ry,
    }));
  };

  const endDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    drag.current = null;
    setDragging(false);
    svgRef.current?.releasePointerCapture?.(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { rx, ry } = vbRatio();
    const mx = (e.clientX - rect.left) * rx;
    const my = (e.clientY - rect.top) * ry;
    setEased(false);
    setCamera((c) => {
      const kNew = clamp(c.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_K, MAX_K);
      return {
        k: kNew,
        tx: mx - (mx - c.tx) * (kNew / c.k),
        ty: my - (my - c.ty) * (kNew / c.k),
      };
    });
  };

  // Reveal front: how far the staged build-out has progressed, in depth units.
  const front = revealRef.current * (maxOrder + 1);
  const nodeReveal = (name: string): number => clamp(front - (depthOf[name] ?? 0), 0, 1);
  // A connector draws just before its child node appears.
  const edgeReveal = (childName: string): number =>
    clamp(front - ((depthOf[childName] ?? 1) - 0.4), 0, 1);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <button
          className="rounded-md border bg-card px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:bg-secondary"
          onClick={() => {
            setEased(true);
            setCamera(fitCamera());
          }}
          type="button"
        >
          Fit
        </button>
      </div>

      <svg
        aria-label="CA fleet topology graph"
        className={cn("topo-canvas", dragging && "dragging")}
        onPointerCancel={endDrag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onWheel={onWheel}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      >
        <g
          className={cn("topo-view", eased && "eased")}
          transform={`translate(${camera.tx},${camera.ty}) scale(${camera.k})`}
        >
          {/* connectors: rail draws in (dashoffset), feeder fades in behind it */}
          {layout.edges.map((edge) => {
            const from = layout.byName[edge.from];
            const to = layout.byName[edge.to];
            if (!from || !to) return null;
            if (visible && !(visible.has(edge.from) && visible.has(edge.to))) return null;
            const rev = edgeReveal(edge.to);
            if (rev <= 0) return null;
            const d = edgePath(focusPos?.[edge.from] ?? from, focusPos?.[edge.to] ?? to);
            return (
              <g key={`${edge.from}->${edge.to}`}>
                <path
                  className="rail"
                  d={d}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - rev}
                />
                <path className={cn("feed", feedClass[edge.state])} d={d} opacity={rev} />
              </g>
            );
          })}

          {/* every CA as a circle; text lives in the node group, painted above
              the connectors (edges render first) */}
          {layout.nodes.map((p) => {
            if (visible && !visible.has(p.name)) return null;
            const op = nodeReveal(p.name);
            if (op <= 0) return null;
            const ep = focusPos?.[p.name] ?? { x: p.x, y: p.y };
            const isRoot = p.role === "root";
            const isSel = p.name === selected;
            const isFocused = p.name === shownFocus;
            const showNumber = !isRoot && (!shownFocus || isFocused);
            // Root stands out in Shield Blue; selected gets the secondary fill.
            let circleFill = "hsl(var(--card))";
            if (isRoot) circleFill = "hsl(var(--primary) / 0.15)";
            else if (isSel) circleFill = "hsl(var(--secondary))";
            let strokeW = 3;
            if (isFocused) strokeW = 5;
            else if (isRoot || isSel) strokeW = 4;
            return (
              <g
                aria-label={`${p.cn} (${p.state})`}
                aria-pressed={isSel}
                className="topo-node cursor-pointer"
                data-node={p.name}
                key={p.name}
                onClick={() => onFocus(p.name)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onFocus(p.name);
                  }
                }}
                opacity={op}
                role="button"
                tabIndex={0}
                transform={`translate(${ep.x},${ep.y})`}
              >
                <circle
                  fill={circleFill}
                  r={p.r}
                  stroke={isRoot ? "hsl(var(--primary))" : stateStroke[p.state]}
                  strokeWidth={strokeW}
                />
                {isRoot ? <RootMark /> : null}
                {showNumber ? (
                  <text
                    className="fill-foreground font-mono font-semibold"
                    dominantBaseline="central"
                    style={{ fontSize: numberFont(p.issued) }}
                    textAnchor="middle"
                    y={1}
                  >
                    {p.issued}
                  </text>
                ) : null}
                <text
                  className="fill-foreground font-mono"
                  style={{ fontSize: 11 }}
                  textAnchor="middle"
                  y={p.r + 16}
                >
                  {p.cn}
                </text>
                {p.hasChildren ? (
                  <g
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleCollapse(p.name);
                    }}
                    transform={`translate(${p.r + 11},0)`}
                  >
                    <circle
                      fill="hsl(var(--card))"
                      r={8}
                      stroke="hsl(var(--border))"
                      strokeWidth={1.5}
                    />
                    <text
                      className="fill-foreground font-mono font-semibold"
                      dominantBaseline="central"
                      style={{ fontSize: 13 }}
                      textAnchor="middle"
                      y={1}
                    >
                      {p.collapsed ? "+" : "-"}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
