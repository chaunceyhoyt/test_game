using UnityEngine;

public class FishingMiniGame : MonoBehaviour
{
    // Fish properties
    public class Fish
    {
        public string Name { get; set; }
        public float Rarity { get; set; } // Rarity from 0 (Common) to 1 (Legendary)
        public float Weight { get; set; } // Weight in pounds
    }

    public Fish currentFish;
    private float tension; // Current tension on the line
    private float tensionThreshold; // Max tension before the line breaks
    private float reelSpeed; // Speed at which the tension increases while reeling
    private float safeZoneSize; // Size of the safe zone on the tension bar
    private bool fishCaught; // Whether the fish has been caught

    private float tensionDecreaseRate = 0.05f; // Rate at which tension decreases when not reeling
    private float tensionIncreaseRate; // Rate at which tension increases based on fish rarity and weight

    void Start()
    {
        // Initialize fish and game variables
        InitializeFish();
        InitializeMiniGame();
    }

    void Update()
    {
        if (!fishCaught)
        {
            HandleReeling();
            UpdateTension();
            CheckForCatch();
        }
    }

    void InitializeFish()
    {
        // Example fish - you'd replace this with your fish spawning logic
        currentFish = new Fish
        {
            Name = "Salmon",
            Rarity = 0.3f, // 30% rarity (common)
            Weight = 5.0f // 5 pounds
        };
    }

    void InitializeMiniGame()
    {
        tension = 0;
        fishCaught = false;

        // Calculate tension increase rate and threshold based on fish properties
        tensionIncreaseRate = 0.1f + (currentFish.Rarity * 0.3f) + (currentFish.Weight * 0.05f);
        tensionThreshold = 1.0f; // Line breaks if tension reaches 1
        reelSpeed = 0.2f; // Adjust this based on player's equipment
        safeZoneSize = 0.4f - (currentFish.Rarity * 0.2f); // Safe zone is smaller for rarer fish
    }

    void HandleReeling()
    {
        if (Input.GetKey(KeyCode.Space)) // Hold space to reel in
        {
            tension += reelSpeed * Time.deltaTime;
        }
        else
        {
            tension -= tensionDecreaseRate * Time.deltaTime;
        }

        // Clamp tension to ensure it stays within bounds
        tension = Mathf.Clamp(tension, 0, tensionThreshold);
    }

    void UpdateTension()
    {
        // Simulate fish struggling
        float fishPull = Mathf.Sin(Time.time * 3.0f) * tensionIncreaseRate * Time.deltaTime;
        tension += fishPull;

        // Clamp tension again after fish pull
        tension = Mathf.Clamp(tension, 0, tensionThreshold);

        // Check if tension is within the safe zone
        float safeZoneMin = (1.0f - safeZoneSize) / 2.0f;
        float safeZoneMax = (1.0f + safeZoneSize) / 2.0f;

        if (tension < safeZoneMin || tension > safeZoneMax)
        {
            Debug.Log("Danger! Tension too high or low!");
        }
    }

    void CheckForCatch()
    {
        if (tension >= tensionThreshold)
        {
            Debug.Log("Line broke! Fish got away.");
            ResetMiniGame();
        }
        else if (tension <= 0.1f && Input.GetKey(KeyCode.Space))
        {
            Debug.Log($"Caught a {currentFish.Name}!");
            fishCaught = true;
            // Add fish to player's inventory or award points here
        }
    }

    void ResetMiniGame()
    {
        tension = 0;
        fishCaught = false;
        // Reset or spawn a new fish
        InitializeFish();
    }
}
