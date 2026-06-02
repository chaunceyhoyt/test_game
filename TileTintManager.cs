using System.Collections;
using UnityEngine;
using UnityEngine.Tilemaps;

public class TileTintManager : MonoBehaviour
{
    public static TileTintManager Instance;  // Singleton instance for easy access

    private Coroutine blinkingCoroutine = null;
    private Vector3Int? currentBlinkingTile = null;
    private Tilemap currentBlinkingTilemap = null;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    public void TintTile(Tilemap tilemap, Vector3Int cellPosition, Color color)
    {
        if (tilemap != null && tilemap.HasTile(cellPosition))
        {
            tilemap.SetTileFlags(cellPosition, TileFlags.None);
            tilemap.SetColor(cellPosition, color);
        }
    }

    public void ResetTile(Tilemap tilemap, Vector3Int cellPosition, Color defaultColor)
    {
        if (tilemap != null && tilemap.HasTile(cellPosition))
        {
            TintTile(tilemap, cellPosition, defaultColor);
        }
    }

    public void StartBlinkingTile(Tilemap tilemap, Vector3Int cellPosition, Color blinkColor, Color defaultColor)
    {
        StopAndResetBlinkingTile();

        currentBlinkingTile = cellPosition;
        currentBlinkingTilemap = tilemap;
        TintTile(tilemap, cellPosition, blinkColor);  // Set initial tint to blink color
        blinkingCoroutine = StartCoroutine(BlinkInvalidTile(tilemap, cellPosition, blinkColor, defaultColor));
    }

    public void StopAndResetBlinkingTile()
    {
        if (blinkingCoroutine != null)
        {
            StopCoroutine(blinkingCoroutine);
            blinkingCoroutine = null;
        }

        if (currentBlinkingTile.HasValue && currentBlinkingTilemap != null)
        {
            TintTile(currentBlinkingTilemap, currentBlinkingTile.Value, Color.white);  // Reset blinking tile color to default
            currentBlinkingTile = null;
            currentBlinkingTilemap = null;
        }
    }

    private IEnumerator BlinkInvalidTile(Tilemap tilemap, Vector3Int cellPosition, Color blinkColor, Color defaultColor)
    {
        bool blinkOn = true;

        while (true)
        {
            TintTile(tilemap, cellPosition, blinkOn ? blinkColor : defaultColor);
            yield return new WaitForSeconds(0.3f);
            blinkOn = !blinkOn;
        }
    }
}
