using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.Tilemaps;

public class PlayerMovement : MonoBehaviour
{
    public GameObject boatPrefab;  // Boat prefab
    public Sprite playerSprite;    // Player's sprite
    public Sprite boatSprite;      // Boat sprite

    public GameObject player;
    public Tilemap groundTilemap;
    public Tilemap dockTilemap;
    public Tilemap waterTilemap;
    public Tilemap obstructionTilemap;
    public Color validPathColor = Color.green;
    public Color invalidPathColor = Color.red;
    public Color defaultTileColor = Color.white;

    private bool isInBoat = false;
    private List<Vector3> path;
    private int currentWaypoint = 0;
    private Pathfinding pathfinding;

    private Tilemap lastTilemap;
    private Vector3Int lastTargetCell;

    public GameObject currentBoat; // Reference to the current boat object
    public MenuManager menuManager;

    private Coroutine blinkingCoroutine = null;
    private Vector3Int? currentBlinkingTile = null;
    private Tilemap currentBlinkingTilemap = null;

    private Vector3Int? lastValidTile = null;  // Track the last valid tile clicked
    private Tilemap lastValidTilemap = null;   // Track the Tilemap of the last valid tile


    void Start()
    {
        GameObject eventsys = GameObject.Find("EventSystem");
        pathfinding = gameObject.GetComponent<Pathfinding>();
        menuManager = eventsys.GetComponent<MenuManager>();
    }

    bool IsPointerOverUI()
    {
        return EventSystem.current.IsPointerOverGameObject();  // Checks if the mouse is over a UI element
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0) && !IsPointerOverUI())
        {
            Vector3 mouseWorldPosition = Camera.main.ScreenToWorldPoint(Input.mousePosition);
            mouseWorldPosition.z = 0;

            Vector3Int cellPosition = groundTilemap.WorldToCell(mouseWorldPosition);
            Tilemap targetTilemap = GetTilemapForTile(cellPosition);

            if (IsValidTarget(cellPosition, targetTilemap))
            {
                StopBlinkingTile();  // Stop blinking if a valid tile is selected
                MoveToTarget(cellPosition, targetTilemap);
            }
            else
            {
                Debug.Log($"Invalid target tile: {cellPosition} on {targetTilemap?.name}");
                StartBlinkingTile(targetTilemap, cellPosition, invalidPathColor);
            }
        }

        if (path != null && currentWaypoint < path.Count)
        {
            MoveAlongPath();
        }

        if (Input.GetKeyDown(KeyCode.B))
        {
            ToggleBoatMode();
        }
    }

    void MoveAlongPath()
    {
        Vector3 target = path[currentWaypoint];
        player.transform.position = Vector3.MoveTowards(player.transform.position, target, 5f * Time.deltaTime);

        if (Vector3.Distance(player.transform.position, target) < 0.1f)
        {
            currentWaypoint++;
        }

        if (currentWaypoint >= path.Count)
        {
            ResetTintOnLastTile();  // Reset tint when path is completed

            // Check if the player has reached the boat
            if (IsNearBoat() && !isInBoat)
            {
                EnterBoat(); // Automatically enter the boat once reached
            }
        }
    }

    bool IsValidTarget(Vector3Int cellPosition, Tilemap targetTilemap)
    {
        bool validTileForBoat = isInBoat && targetTilemap == waterTilemap || targetTilemap == dockTilemap;
        bool validTileForWalk = !isInBoat && targetTilemap == groundTilemap || targetTilemap == dockTilemap;
        return validTileForBoat || validTileForWalk;
    }

    Tilemap GetTilemapForTile(Vector3Int cellPosition)
    {
        if (groundTilemap.HasTile(cellPosition)) return groundTilemap;
        if (waterTilemap.HasTile(cellPosition)) return waterTilemap;
        if (obstructionTilemap.HasTile(cellPosition)) return obstructionTilemap;
        return null;
    }

    void MoveToTarget(Vector3Int cellPosition, Tilemap targetTilemap)
    {
        ResetTintOnLastTile();          // Reset the previous invalid tile tint
        ResetLastValidTile();           // Reset the previous valid tile tint

        // Stop any ongoing blinking and reset the color
        StopAndResetBlinkingTile();

        Vector3 targetPosition = targetTilemap.GetCellCenterWorld(cellPosition);
        path = pathfinding.FindPath(player.transform.position, targetPosition, isInBoat);

        if (path != null && path.Count > 0)
        {
            TintTile(targetTilemap, cellPosition, validPathColor);  // Tint valid tile green
            lastValidTile = cellPosition;
            lastValidTilemap = targetTilemap;
            currentWaypoint = 0;
        }
        else
        {
            StartBlinkingTile(targetTilemap, cellPosition, invalidPathColor);  // Blink invalid tile red
        }

        lastTilemap = targetTilemap;
        lastTargetCell = cellPosition;
    }


    void ResetLastValidTile()
    {
        if (lastValidTile.HasValue && lastValidTilemap != null)
        {
            TintTile(lastValidTilemap, lastValidTile.Value, defaultTileColor);  // Reset the last valid tile to default color
            lastValidTile = null;
            lastValidTilemap = null;
        }
    }

    void StartBlinkingTile(Tilemap tilemap, Vector3Int cellPosition, Color blinkColor)
    {
        // Stop any previous blinking coroutine and reset color
        StopAndResetBlinkingTile();

        currentBlinkingTile = cellPosition;
        currentBlinkingTilemap = tilemap;

        TintTile(tilemap, cellPosition, blinkColor);  // Set initial tint to blink color
        blinkingCoroutine = StartCoroutine(BlinkInvalidTile(tilemap, cellPosition, blinkColor));
    }

    void StopAndResetBlinkingTile()
    {
        if (blinkingCoroutine != null)
        {
            StopCoroutine(blinkingCoroutine);
            blinkingCoroutine = null;
        }

        if (currentBlinkingTile.HasValue && currentBlinkingTilemap != null)
        {
            TintTile(currentBlinkingTilemap, currentBlinkingTile.Value, defaultTileColor);  // Reset blinking tile color
            currentBlinkingTile = null;
            currentBlinkingTilemap = null;
        }
    }

    IEnumerator BlinkInvalidTile(Tilemap tilemap, Vector3Int cellPosition, Color blinkColor)
    {
        bool blinkOn = true;

        while (true)
        {
            TintTile(tilemap, cellPosition, blinkOn ? blinkColor : defaultTileColor);
            yield return new WaitForSeconds(0.3f);
            blinkOn = !blinkOn;
        }
    }

    void TintTile(Tilemap tilemap, Vector3Int cellPosition, Color color)
    {
        if (tilemap != null && tilemap.HasTile(cellPosition))
        {
            tilemap.SetTileFlags(cellPosition, TileFlags.None);
            tilemap.SetColor(cellPosition, color);
        }
    }

    void ResetTintOnLastTile()
    {
        if (lastTilemap != null && lastTilemap.HasTile(lastTargetCell))
        {
            TintTile(lastTilemap, lastTargetCell, defaultTileColor);  // Reset the tint of the last selected invalid tile
            lastTilemap = null;
        }
    }


    void StopBlinkingTile()
    {
        if (blinkingCoroutine != null)
        {
            StopCoroutine(blinkingCoroutine);
            blinkingCoroutine = null;

            if (lastTilemap != null)
            {
                TintTile(lastTilemap, lastTargetCell, defaultTileColor);  // Reset tint
            }
        }
    }

    bool IsClickOnBoat(Vector3 position)
    {
        Collider2D boatCollider = currentBoat ? currentBoat.GetComponent<Collider2D>() : null;
        return boatCollider != null && boatCollider.OverlapPoint(position);
    }

    void EnterBoat()
    {
        player.GetComponent<SpriteRenderer>().sprite = boatSprite;
        player.transform.position = currentBoat.transform.position;
        currentBoat.SetActive(false);
        isInBoat = true;
    }

    void LeaveBoat()
    {
        player.GetComponent<SpriteRenderer>().sprite = playerSprite;
        currentBoat.transform.position = player.transform.position;
        currentBoat.SetActive(true);
        isInBoat = false;
    }

    void ToggleBoatMode()
    {
        if (IsNearBoat() && !isInBoat)
        {
            EnterBoat();
        }
        else if (IsNearGroundTile() && isInBoat)
        {
            LeaveBoat();
        }
    }

    bool IsNearBoat()
    {
        return Vector3.Distance(player.transform.position, currentBoat.transform.position) < 1.5f;
    }

    bool IsNearGroundTile()
    {
        Vector3Int currentCell = groundTilemap.WorldToCell(player.transform.position);
        return groundTilemap.HasTile(currentCell);
    }

}
