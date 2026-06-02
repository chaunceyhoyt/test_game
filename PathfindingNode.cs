using UnityEngine;

public class PathfindingNode
{
    public Vector3Int Position;
    public float GCost; // Cost from start to this node
    public float HCost; // Heuristic cost from this node to the target
    public float FCost => GCost + HCost; // Total cost
    public PathfindingNode Parent;

    public PathfindingNode(Vector3Int position)
    {
        Position = position;
    }
}
