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

import { TopologyExplorer } from "@/components/topology-explorer";

// The node list, plus the topology treatment: clicking a node (in the list or
// the canvas) shows only its single path back to the Root (no descendant fan).
export const NodesPage = () => {
  return <TopologyExplorer singlePath title="Nodes" withList />;
};
