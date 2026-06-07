import hashlib


def hash_pair(left: str, right: str) -> str:
    return hashlib.sha256((left + right).encode("utf-8")).hexdigest()


def _pad_level(level: list[str]) -> list[str]:
    if len(level) % 2 == 1:
        return level + [level[-1]]
    return level


def build_merkle_tree(leaf_hashes: list[str]) -> tuple[str, list[list[dict]]]:
    n = len(leaf_hashes)
    if n == 0:
        raise ValueError("Cannot build a Merkle Tree from an empty list.")

    if n == 1:
        return leaf_hashes[0], [[]]
    levels: list[list[str]] = [list(leaf_hashes)]

    while len(levels[-1]) > 1:
        current = _pad_level(levels[-1])  # pad for hashing
        next_level = [
            hash_pair(current[i], current[i + 1])
            for i in range(0, len(current), 2)
        ]
        levels.append(next_level)

    merkle_root = levels[-1][0]

    proof_paths: list[list[dict]] = []

    for leaf_idx in range(n):
        proof_path: list[dict] = []
        idx = leaf_idx

        for level_idx in range(len(levels) - 1):  # exclude root level
            level = _pad_level(levels[level_idx])

            if idx % 2 == 0:
                sibling_idx = idx + 1
                proof_path.append({
                    "hash":      level[sibling_idx],
                    "direction": "right",  
                })

            else:
                sibling_idx = idx - 1
                proof_path.append({
                    "hash":      level[sibling_idx],
                    "direction": "left",
                })

            idx = idx // 2  

        proof_paths.append(proof_path)

    return merkle_root, proof_paths


def reconstruct_merkle_root(leaf_hash: str, proof_path: list[dict]) -> str:
    current = leaf_hash
    for node in proof_path:
        sibling = node["hash"]
        if node["direction"] == "left":
            current = hash_pair(sibling, current)
        else:
            current = hash_pair(current, sibling)
    return current