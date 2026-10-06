import { interpolate } from "remotion";
import { videoTokens as t } from "../videoTokens";

const nodes = [
  { id: "H1", x: 46, y: 500, level: 0 },
  { id: "H2", x: 150, y: 500, level: 0 },
  { id: "H3", x: 254, y: 500, level: 0 },
  { id: "H4", x: 358, y: 500, level: 0 },
  { id: "H5", x: 462, y: 500, level: 0 },
  { id: "H6", x: 566, y: 500, level: 0 },
  { id: "H7", x: 670, y: 500, level: 0 },
  { id: "H8", x: 774, y: 500, level: 0 },
  { id: "H12", x: 98, y: 350, level: 1 },
  { id: "H34", x: 306, y: 350, level: 1 },
  { id: "H56", x: 514, y: 350, level: 1 },
  { id: "H78", x: 722, y: 350, level: 1 },
  { id: "H1234", x: 202, y: 200, level: 2 },
  { id: "H5678", x: 618, y: 200, level: 2 },
  { id: "ROOT", x: 410, y: 55, level: 3 },
];

const edges = [
  ["H1", "H12"], ["H2", "H12"], ["H3", "H34"], ["H4", "H34"],
  ["H5", "H56"], ["H6", "H56"], ["H7", "H78"], ["H8", "H78"],
  ["H12", "H1234"], ["H34", "H1234"], ["H56", "H5678"], ["H78", "H5678"],
  ["H1234", "ROOT"], ["H5678", "ROOT"],
];

const proofPath = new Set(["H3", "H4", "H34", "H12", "H1234", "H5678", "ROOT"]);

export function MerkleTree({ frame = 0 }) {
  const treeProgress = interpolate(frame, [10, 190], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const selected = frame >= 195;
  const proofProgress = interpolate(frame, [205, 260], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const visibleLevel = frame < 75 ? 0 : frame < 125 ? 1 : frame < 170 ? 2 : 3;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <div style={{ height: 570, position: "relative", width: 820 }}>
      <svg height="570" width="820" style={{ inset: 0, overflow: "visible", position: "absolute" }}>
        {edges.map(([fromId, toId], index) => {
          const from = nodeMap.get(fromId);
          const to = nodeMap.get(toId);
          const edgeVisible = from.level < visibleLevel || (from.level === visibleLevel && treeProgress > 0.45);
          const isProofEdge = proofPath.has(fromId) && proofPath.has(toId);
          const edgeOpacity = edgeVisible ? (selected && !isProofEdge ? 0.18 : 1) : 0;
          return (
            <path
              d={`M${from.x} ${from.y - 22} L${to.x} ${to.y + 22}`}
              fill="none"
              key={`${fromId}-${toId}`}
              stroke={selected && isProofEdge && proofProgress > index / edges.length ? t.accentBright : t.border}
              strokeDasharray={selected && isProofEdge ? "8 7" : undefined}
              strokeWidth={selected && isProofEdge ? 4 : 2}
              style={{ opacity: edgeOpacity }}
            />
          );
        })}
      </svg>
      {nodes.map((node) => {
        const visible = node.level <= visibleLevel;
        const isRoot = node.id === "ROOT";
        const isProofNode = proofPath.has(node.id);
        const isTarget = node.id === "H3";
        return (
          <div
            key={node.id}
            style={{
              background: isRoot || (selected && isProofNode) ? "#134e4a" : t.panel,
              border: `2px solid ${isRoot || (selected && isProofNode) ? t.accentBright : t.border}`,
              borderRadius: t.radiusCard,
              boxShadow: isRoot ? `0 0 32px ${t.accentBright}55` : isTarget && selected ? `0 0 28px ${t.accentBright}66` : "none",
              color: isRoot || (selected && isProofNode) ? "#d1fae5" : t.body,
              left: node.x,
              opacity: visible ? (selected && !isProofNode ? 0.22 : 1) : 0,
              padding: isRoot ? "12px 25px" : "9px 14px",
              position: "absolute",
              scale: isTarget && selected ? 1.18 : 1,
              textAlign: "center",
              top: node.y,
              transform: "translate(-50%, -50%)",
              transition: "none",
            }}
          >
            <div style={{ color: isRoot ? t.accentBright : "inherit", fontFamily: "monospace", fontSize: isRoot ? 22 : 16, fontWeight: 800 }}>{node.id}</div>
            <div style={{ color: t.muted, fontSize: 10, marginTop: 3 }}>{isRoot ? "Merkle Root" : node.level === 0 ? "certificate hash" : "parent hash"}</div>
          </div>
        );
      })}
    </div>
  );
}
