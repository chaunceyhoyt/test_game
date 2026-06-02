using UnityEngine;
using UnityEngine.Tilemaps;
using System.Collections;



public enum TilemapType
{
    Ground,
    Dock,
    Water,
    Unknown
}


public class PlayerController : MonoBehaviour
{
    public Tilemap groundTilemap;
    public Tilemap dockTilemap;
    public Tilemap waterTilemap;
    public Tilemap obstructionTilemap;
    public GameObject boat;

    public Sprite playerSprite;
    public Sprite boatSprite;

    public bool isInBoat = false;
    private Vector3 targetPosition;
    private bool isMoving = false;
    private float moveSpeed = 5f;
    private Camera mainCamera;
    private SpriteRenderer spriteRenderer;
    private TilemapType targetTilemapType;

    private void Start()
    {
        mainCamera = Camera.main;
        spriteRenderer = GetComponent<SpriteRenderer>();
        spriteRenderer.sprite = playerSprite; // Set default
    }

    void Update()
    {
        if (Input.GetMouseButtonDown(0) && !isMoving)
        {
            Vector3 mouseWorldPosition = mainCamera.ScreenToWorldPoint(Input.mousePosition);
            mouseWorldPosition.z = 0;


            ///click on water while in boat
            if (isInBoat && IsClickOnWaterTile(mouseWorldPosition))
            {
                targetPosition = mouseWorldPosition;
                StartCoroutine(MoveToTargetPosition(targetPosition));
            }
            ///click on water while in boat
            if (!isInBoat && CanBoat(mouseWorldPosition))
            {
                targetPosition = mouseWorldPosition;
                StartCoroutine(MoveToTargetPosition(targetPosition));
            }
            ///click on ground or dock while walking
            else if (!isInBoat && (IsClickOnGroundTile(mouseWorldPosition) || IsClickOnDockTile(mouseWorldPosition)))
            {
                targetPosition = mouseWorldPosition;
                StartCoroutine(MoveToTargetPosition(targetPosition));
            }
            ///click on dock while in boat
            else if (isInBoat && IsClickOnDockTile(mouseWorldPosition))
            {
                // Optional disembark
                targetPosition = mouseWorldPosition;
                StartCoroutine(MoveToTargetPosition(targetPosition, disembarkAfter: true));
            }
        }
    }

    bool CanBoat(Vector3 pos)
    {

        Vector3Int playerPos = dockTilemap.WorldToCell(transform.position);
        Vector3Int cellPos = waterTilemap.WorldToCell(pos);
        return waterTilemap.HasTile(cellPos) && !IsObstructionTile(cellPos) && dockTilemap.HasTile(playerPos);
    }

    bool IsClickOnWaterTile(Vector3 pos)
    {
        Vector3Int cellPos = waterTilemap.WorldToCell(pos);
        return waterTilemap.HasTile(cellPos) && !IsObstructionTile(cellPos);
    }

    bool IsClickOnGroundTile(Vector3 pos)
    {
        Vector3Int cellPos = groundTilemap.WorldToCell(pos);
        return groundTilemap.HasTile(cellPos) && !IsObstructionTile(cellPos);
    }

    bool IsClickOnDockTile(Vector3 pos)
    {
        Vector3Int cellPos = dockTilemap.WorldToCell(pos);
        return dockTilemap.HasTile(cellPos) && !IsObstructionTile(cellPos);
    }

    bool IsObstructionTile(Vector3Int pos)
    {
        return obstructionTilemap.HasTile(pos);
    }

    TilemapType GetTilemapTypeAtPosition(Vector3 worldPosition)
    {
        Vector3Int cellPos = groundTilemap.WorldToCell(worldPosition);

        if (groundTilemap.HasTile(cellPos))
            return TilemapType.Ground;
        if (dockTilemap.HasTile(cellPos))
            return TilemapType.Dock;
        if (waterTilemap.HasTile(cellPos))
            return TilemapType.Water;

        return TilemapType.Unknown;
    }

 
    IEnumerator MoveToTargetPosition(Vector3 target, bool disembarkAfter = false)
    {
        isMoving = true;

        while (Vector3.Distance(transform.position, target) > 0.05f)
        {
            transform.position = Vector3.MoveTowards(transform.position, target, moveSpeed * Time.deltaTime);
            targetTilemapType = GetTilemapTypeAtPosition(transform.position);
            yield return null;
        }

        transform.position = target;

        if (isInBoat)
        {
            isInBoat = true;
            spriteRenderer.sprite = boatSprite;
            spriteRenderer.color = Color.grey;
            Debug.Log("Player entered the boat.");
        }
        else if (disembarkAfter && isInBoat)
        {
            isInBoat = false;
            spriteRenderer.sprite = playerSprite;
            spriteRenderer.color= Color.white;
            Debug.Log("Player exited the boat.");
        }

        isMoving = false;
    }

}
