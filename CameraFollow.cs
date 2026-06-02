using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("Camera Follow Settings")]
    public Transform target;              // The target the camera will follow (player)
    public float smoothSpeed = 0.125f;     // The speed of the smooth camera movement
    public Vector3 offset = new Vector3(0, 0, -10); // Offset to keep the camera above the player

    [Header("Camera Bounds")]
    public bool useBounds = false;        // Enable or disable camera bounds
    public Vector2 minBounds;             // Minimum X and Y bounds for the camera
    public Vector2 maxBounds;             // Maximum X and Y bounds for the camera

    private Camera cam;                   // Reference to the main camera

    void Start()
    {
        cam = Camera.main; // Get the main camera
    }

    void LateUpdate()
    {
        if (target == null)
            return;

        // Calculate the desired position of the camera
        Vector3 desiredPosition = target.position + offset;

        // Smoothly interpolate between the current position and the desired position
        Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed);

        // Apply bounds if enabled
        if (useBounds)
        {
            smoothedPosition = ClampToBounds(smoothedPosition);
        }

        // Update the camera's position
        transform.position = smoothedPosition;
    }

    Vector3 ClampToBounds(Vector3 position)
    {
        // Calculate the camera's half dimensions based on orthographic size and aspect ratio
        float halfHeight = cam.orthographicSize;
        float halfWidth = cam.orthographicSize * cam.aspect;

        // Clamp the camera's position to the defined bounds
        position.x = Mathf.Clamp(position.x, minBounds.x + halfWidth, maxBounds.x - halfWidth);
        position.y = Mathf.Clamp(position.y, minBounds.y + halfHeight, maxBounds.y - halfHeight);

        // Return the clamped position
        return position;
    }
}
