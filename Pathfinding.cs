using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;

public class Pathfinding : MonoBehaviour
{
    public Tilemap groundTilemap;
    public Tilemap waterTilemap;
    public Tilemap obstructionTilemap;
    public GameObject currentBoat;

    public List<Vector3> FindPath(Vector3 startPosition, Vector3 targetPosition, bool isInBoat)
    {
        List<Vector3> path = new List<Vector3>();

        Vector3Int startTile = groundTilemap.WorldToCell(startPosition);
        Vector3Int targetTile = groundTilemap.WorldToCell(targetPosition);

        Tilemap currentTilemap = isInBoat ? waterTilemap : groundTilemap;

        // Check if the target tile is valid
        if (!currentTilemap.HasTile(targetTile) && IsObstructionTile(targetTile))
        {
            Debug.Log("Invalid target tile. Cannot move to this location.");
            return path;
        }

        Queue<Vector3Int> openList = new Queue<Vector3Int>();
        Dictionary<Vector3Int, Vector3Int?> cameFrom = new Dictionary<Vector3Int, Vector3Int?>();
        openList.Enqueue(startTile);
        cameFrom[startTile] = null;

        while (openList.Count > 0)
        {
            Vector3Int current = openList.Dequeue();

            if (current == targetTile)
            {
                while (current != startTile)
                {
                    path.Insert(0, currentTilemap.GetCellCenterWorld(current));
                    current = cameFrom[current].Value;
                }
                path.Insert(0, currentTilemap.GetCellCenterWorld(startTile));
                return path;
            }

            foreach (Vector3Int direction in new Vector3Int[]
            {
            new Vector3Int(1, 0, 0),
            new Vector3Int(-1, 0, 0),
            new Vector3Int(0, 1, 0),
            new Vector3Int(0, -1, 0)
            })
            {
                Vector3Int neighbor = current + direction;

                if (IsWalkable(neighbor, currentTilemap, isInBoat) && !cameFrom.ContainsKey(neighbor))
                {
                    openList.Enqueue(neighbor);
                    cameFrom[neighbor] = current;
                }
            }
        }

        Debug.Log("No valid path found.");
        return path; // Return empty if no valid path found
    }


    private bool IsWalkable(Vector3Int tilePosition, Tilemap currentTilemap, bool isInBoat)
    {
        // Check if the tile exists and is not an obstruction
        if (!currentTilemap.HasTile(tilePosition) || IsObstructionTile(tilePosition))
            return false;

        // For boats: only allow water tiles
        if (isInBoat && !waterTilemap.HasTile(tilePosition))
            return false;

        // For ground: only allow ground tiles
        if (!isInBoat && !groundTilemap.HasTile(tilePosition))
            return false;

        return true;
    }

    private bool IsObstructionTile(Vector3Int tilePosition)
    {
        return obstructionTilemap.HasTile(tilePosition);
    }
}
