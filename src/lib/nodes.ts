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

import { useSyncExternalStore } from "react";

import { mockNodes, type Node } from "@/lib/mock";

// The live fleet. Seeded from the mock fixture; mutated by enrollment approval
// (addNode). useSyncExternalStore lets the topology, nodes table, and root list
// re-render when the fleet changes, and is the seam a live provider drops into.
let nodes: Node[] = [...mockNodes];
const listeners = new Set<() => void>();
const emit = (): void => {
  for (const l of listeners) l();
};
const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const nodesList = (): Node[] => nodes;
export const getNode = (name: string): Node | undefined => nodes.find((n) => n.name === name);
export const getNodeByCn = (cn: string): Node | undefined => nodes.find((n) => n.cn === cn);

export const useNodes = (): Node[] =>
  useSyncExternalStore(
    subscribe,
    () => nodes,
    () => nodes,
  );

export const addNode = (node: Node): void => {
  nodes = [...nodes, node];
  emit();
};

// Test-only: restore the seeded fixture between tests.
export const __resetNodes = (): void => {
  nodes = [...mockNodes];
  emit();
};
