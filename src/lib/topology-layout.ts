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

import {
  aggregateState,
  childrenOf,
  getNode,
  getNodeByCn,
  groupThreshold,
  type IdentityState,
  type Node,
  type NodeRole,
} from "@/lib/mock";

/** A node placed at SVG coordinates for the focus view (viewBox 0 0 720 520). */
export interface Placed {
  cn: string;
  name: string;
  r: number;
  role: NodeRole;
  state: IdentityState;
  x: number;
  y: number;
}

/** An off-path branch, rendered as a clickable chip below the spine. */
export interface Chip {
  count: number;
  key: string;
  label: string;
  refocus: string;
  state: IdentityState;
}

/** A collapsed group box hanging off the focus. */
export interface GroupBox {
  anchorY: number;
  width: number;
  x: number;
  y: number;
}

/** What renders to the right of the focus. */
export type Downstream =
  | { box: GroupBox; kind: "group"; members: Node[]; parent: Node }
  | { count: number; kind: "leaves"; x: number; y: number }
  | { kind: "nodes"; nodes: Placed[] };

export interface FocusLayout {
  chips: Chip[];
  downstream: Downstream;
  focus: Placed;
  spine: Placed[];
}

const ROOT_X = 90;
const SPINE_Y = 200;
const SPINE_STEP = 170;
const DS_X_GAP = 150;

const placedFrom = (node: Node, x: number, y: number, r: number): Placed => ({
  cn: node.cn,
  name: node.name,
  r,
  role: node.role,
  state: node.identityState,
  x,
  y,
});

// Walk parentCn up to the root, returning [root, ..., focus].
const spineOf = (focus: Node): Node[] => {
  const chain: Node[] = [focus];
  let cursor = focus;
  while (cursor.parentCn) {
    const parent = getNodeByCn(cursor.parentCn);
    if (!parent) break;
    chain.unshift(parent);
    cursor = parent;
  }
  return chain;
};

const roleWordPlural = (role: NodeRole): string => {
  if (role === "issuing") return "Issuing CAs";
  if (role === "intermediate") return "Intermediate CAs";
  return "CAs";
};

// One off-path set becomes either a single aggregated chip (wide/homogeneous)
// or one chip per branch (few, distinct branches like sibling intermediates).
const chipsForOffPath = (offPath: Node[]): Chip[] => {
  if (offPath.length === 0) return [];
  if (offPath.length > groupThreshold) {
    return [
      {
        count: offPath.length,
        key: `sib-${offPath[0].name}`,
        label: `${offPath.length} sibling ${roleWordPlural(offPath[0].role)}`,
        refocus: offPath[0].name,
        state: aggregateState(offPath),
      },
    ];
  }
  return offPath.map((branch) => {
    const subtree = [branch, ...childrenOf(branch.cn)];
    return {
      count: childrenOf(branch.cn).length,
      key: `br-${branch.name}`,
      label: branch.cn,
      refocus: branch.name,
      state: aggregateState(subtree),
    };
  });
};

export const computeFocusLayout = (focusName: string, nodes: Node[]): FocusLayout => {
  const focusNode = getNode(focusName) ?? nodes[0];
  const chain = spineOf(focusNode);

  const spine = chain.map((n, i) => {
    const isRoot = i === 0;
    const isFocus = i === chain.length - 1;
    const x = isRoot ? ROOT_X : ROOT_X + i * SPINE_STEP;
    const r = isFocus ? 34 : isRoot ? 30 : 24;
    return placedFrom(n, x, SPINE_Y, r);
  });
  const focus = spine[spine.length - 1];

  const kids = childrenOf(focusNode.cn);
  let downstream: Downstream;
  if (focusNode.role === "issuing" || kids.length === 0) {
    downstream = { count: focusNode.issued, kind: "leaves", x: focus.x + 80, y: SPINE_Y };
  } else if (kids.length > groupThreshold) {
    downstream = {
      box: { anchorY: SPINE_Y, width: 210, x: focus.x + 100, y: SPINE_Y - 90 },
      kind: "group",
      members: kids,
      parent: focusNode,
    };
  } else {
    const dsX = focus.x + DS_X_GAP;
    const spread = (kids.length - 1) * 66;
    const dsNodes = kids.map((k, i) => placedFrom(k, dsX, SPINE_Y - spread / 2 + i * 66, 22));
    downstream = { kind: "nodes", nodes: dsNodes };
  }

  const spineNames = new Set(chain.map((n) => n.name));
  const chips: Chip[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const offPath = childrenOf(chain[i].cn).filter((c) => !spineNames.has(c.name));
    chips.push(...chipsForOffPath(offPath));
  }

  return { chips, downstream, focus, spine };
};
