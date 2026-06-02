using UnityEngine;

public class BoatController : MonoBehaviour
{
    public Texture2D depthMap; // The water depth map image
    public float minDepthInMeters = 0f;
    public float maxDepthInMeters = 100f;

    public float maxSpeed = 10f;  // Maximum boat speed
    public float minSpeed = 1f;   // Minimum boat speed when gas runs out
    public float gas = 100f;      // Initial gas level
    public float gasConsumptionRate = 1f; // Gas consumption per second at max speed
    private Vector3 targetPosition;
    private bool isMoving = false;

    void Update()
    {
        HandleTouchInput();

        if (isMoving)
        {
            MoveBoat();
        }
    }

    void HandleTouchInput()
    {
        // Detect touch input
        if (Input.GetMouseButtonDown(0)) // Mouse button click or touch (for mobile)
        {
            Vector3 touchPosition = Input.mousePosition;
            Ray ray = Camera.main.ScreenPointToRay(touchPosition);

            if (Physics.Raycast(ray, out RaycastHit hit))
            {
                if (hit.collider.CompareTag("Water")) // Assuming the water plane has the "Water" tag
                {
                    targetPosition = hit.point;
                    isMoving = true;
                }
            }
        }
    }

    void MoveBoat()
    {
        // Calculate the speed based on gas level
        float speed = gas > 0 ? maxSpeed : minSpeed;

        // Move towards the target position
        transform.position = Vector3.MoveTowards(transform.position, targetPosition, speed * Time.deltaTime);

        // Consume gas
        if (gas > 0)
        {
            gas -= gasConsumptionRate * Time.deltaTime;
        }

        // Check if the boat has reached the target position
        if (Vector3.Distance(transform.position, targetPosition) < 0.1f)
        {
            isMoving = false;
            OnBoatStopped();
        }
    }

    void OnBoatStopped()
    {
        // Calculate the depth at the boat's position
        float depthAtLocation = CalculateDepthAt(transform.position);
        Debug.Log("Boat stopped. Depth at location: " + depthAtLocation + " meters");

        // Placeholder function to calculate fish at this location
        CalculateFishAtLocation(depthAtLocation);
    }

    float CalculateDepthAt(Vector3 worldPosition)
    {
        // Convert world position to texture coordinates (assuming a flat water plane)
        Vector2 textureCoord = WorldPositionToTextureCoord(worldPosition);

        // Get the depth in meters from the depth map
        return CalculateDepthInMetersAt(textureCoord);
    }

    Vector2 WorldPositionToTextureCoord(Vector3 worldPosition)
    {
        // Example conversion from world position to normalized texture coordinates
        // This assumes your water plane covers the entire texture
        // Adjust the scaling factors based on your water plane's size and position
        float xCoord = Mathf.InverseLerp(-50f, 50f, worldPosition.x); // Example range of the water plane in world space
        float yCoord = Mathf.InverseLerp(-50f, 50f, worldPosition.z); // Example range of the water plane in world space
        return new Vector2(xCoord, yCoord);
    }

    float CalculateDepthInMetersAt(Vector2 samplePoint)
    {
        // Convert the sample point to pixel coordinates
        int x = Mathf.FloorToInt(samplePoint.x * depthMap.width);
        int y = Mathf.FloorToInt(samplePoint.y * depthMap.height);

        // Get the color of the pixel
        Color pixelColor = depthMap.GetPixel(x, y);

        // Convert the pixel color to grayscale (brightness)
        float grayscale = pixelColor.grayscale;  // 0.0 (black) to 1.0 (white)

        // Map grayscale to the real-world depth range in meters
        float depthInMeters = Mathf.Lerp(minDepthInMeters, maxDepthInMeters, 1 - grayscale); // 1-grayscale to invert brightness
        
        return depthInMeters;
    }

    void CalculateFishAtLocation(float depth)
    {
        // Placeholder function to calculate fish at this location
        Debug.Log("Calculating fish at depth: " + depth + " meters...");
        // Add your fish calculation logic here
    }
}
