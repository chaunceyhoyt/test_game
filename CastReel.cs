using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems; // Add this to use EventTrigger

[System.Serializable]
public class CastReel : MonoBehaviour
{
    // Public variables
    public Slider reelMeter; // Reference to the slider for reeling in
    public Image successZoneImage; // Image or UI element to highlight the success zone
    public float reelSpeed = 1f; // How fast the reel moves
    public float maxReelTime = 10f; // Total time player has to reel the fish in
    public Button castButton; // Button to cast the line
    public EventTrigger reelButtonEventTrigger; // EventTrigger for reel button
    public FishSelect fishSelect;

    // Private variables
    public float reelValue;
    public bool isLineCast = false; // If the line is cast
    public bool isReeling = false; // If the player is currently reeling
    public float successMin = 0.8f; // Min threshold for a successful reel
    public float successMax = 1.0f; // Max threshold for a successful reel
    public float reelTimer; // Timer for how long the fish is hooked
    public float minReelSpeed = 0.5f; // Minimum reel speed
    public float maxReelSpeed = 2.0f; // Maximum reel speed
    float catchAreaSize = 2;
    public float catchTimer = 0;

    private void Start()
    {
        fishSelect = gameObject.GetComponent<FishSelect>();
        // Deactivate UI elements at the start
        reelMeter.gameObject.SetActive(false);
        successZoneImage.gameObject.SetActive(false);
        reelValue = reelMeter.value;
        // Randomize the reel speed within the given range
        reelSpeed = Random.Range(minReelSpeed, maxReelSpeed);
        Debug.Log("Reel Speed: " + reelSpeed);
    }



    void Update()
    {
        HandleInput();
    }

    void HandleInput()
    {
        if (isLineCast && isReeling)
        {
            reelTimer += Time.deltaTime;

            // If player is reeling
            UpdateReelMeter(true);

            // Deactivate the meter if reel time exceeds max time
            if (reelTimer >= maxReelTime)
            {
                Debug.Log("The fish got off the hook");
                OnFishLost();
            }

            CheckForSuccess();
        }
        if (isLineCast && !isReeling)
        {
            reelTimer += Time.deltaTime;
            UpdateReelMeter(false);
           if (reelTimer >= maxReelTime)
            {
                OnFishLost();
            }
        }
        reelValue = reelMeter.value;

        if (reelMeter.value >= successMin && reelMeter.value <= successMax)
        {
            catchTimer += 1;
        }

    }

    public void CastLine()
    {
        
        if (isLineCast) return;
        // Show cast animation, play sound, etc.
        Debug.Log("You have cast a line");
        isLineCast = true;
        reelMeter.value = .0f;
        catchAreaSize = 1;
        fishSelect.SelectFish();
        StartReeling();
    }

    void StartReeling()
    {
        reelMeter.gameObject.SetActive(true);
        successZoneImage.gameObject.SetActive(true); // Activate the success zone indicator
        isReeling = false; // Start with no reeling yet
        reelTimer = 0f; // Reset reel timer
        SetSuccessWindow(catchAreaSize);
    }

    public void ReduceCatchAreaSize()
    {
        if (isLineCast)
        {
            catchAreaSize -= 0.33f;
            SetSuccessWindow(catchAreaSize);
        }

    }



    public void HandleReeling(bool isReelingInput)
    {
        if (!isLineCast) return; // Only allow reeling if the line is cast

        isReeling = isReelingInput; // Reeling is true when button is pressed, false when released
    }

    void UpdateReelMeter(bool isReelingInput)
    {
        float reelChange = reelSpeed * Time.deltaTime;

        if (isReelingInput)
        {
            reelMeter.value = Mathf.Clamp(reelMeter.value + reelChange, 0f, 1f); // Reel in
            Debug.Log("You are reeling");
        }
        else
        {
            reelMeter.value = Mathf.Clamp(reelMeter.value - reelChange, 0f, 1f); // Reel out when not reeling
            Debug.Log("You are not reeling");
        }
    }

    public void CheckForSuccess()
    {
  
        reelSpeed = Random.Range(minReelSpeed, maxReelSpeed);
        if (!isReeling)
        { // Only check success when reeling
            // Check if the player is in the success zone

            if (catchTimer > 100)
            {
                Debug.Log("You caught a fish!");
                OnFishCaught();
            }
        }
        
    }

    public void SetSuccessWindow(float rarityMultiplier)
    {
        // Define the size of the success window based on the rarityMultiplier
        float baseWindowSize = 0.2f;  // Base size of success zone
        float windowSize = baseWindowSize * rarityMultiplier;  // Adjust size based on rarity

        if (windowSize < .1)
        {
            Debug.Log("Window size too small");
            OnFishLost();
            return;
        }

        // Randomize successMin but ensure that the entire window fits within the slider's bounds
        successMin = Random.Range(0.1f, 1f - windowSize); // Ensure range to fit the success zone
        successMax = successMin + windowSize; // Ensure the size stays constant

        Debug.Log("Success Min: " + successMin);
        Debug.Log("Success Max: " + successMax);

        // Update the success zone visual
        UpdateSuccessZoneVisual();
    }

    void UpdateSuccessZoneVisual()
    {
        // Get the RectTransform of the successZoneImage
        RectTransform successZoneRect = successZoneImage.GetComponent<RectTransform>();

        // Get the total width of the reelMeter (the slider)
        float sliderWidth = reelMeter.GetComponent<RectTransform>().rect.width;

        // Calculate the width of the success zone as a proportion of the slider's total width
        float successZoneWidth = (successMax - successMin) * sliderWidth;

        // Calculate the X position based on the minimum success value
        float successZonePos = successMin * sliderWidth;

        // Update the successZoneImage size and position
        // Set the width of the success zone
        successZoneRect.sizeDelta = new Vector2(successZoneWidth, successZoneRect.sizeDelta.y);

        // Adjust the anchored position, ensuring it starts at the correct point on the slider
        // anchoredPosition should be relative to the left edge, not the center.
        successZoneRect.anchoredPosition = new Vector2(successZonePos, successZoneRect.anchoredPosition.y);

        Debug.Log("Success Zone Width: " + successZoneWidth);
        Debug.Log("Success Zone Position (from left): " + successZonePos);
    }





    void OnFishCaught()
    {
        // Handle the logic for a caught fish (e.g., add to inventory)
        Debug.Log("Fish Caught!");
        //fishSelect.AddFish();
        ResetFishing();
    }

    void OnFishLost()
    {
        // Handle the logic for a lost fish
        Debug.Log("Fish Lost!");
        ResetFishing();
    }

    void ResetFishing()
    {
        // Reset all the relevant game elements to their initial state
        
        reelMeter.gameObject.SetActive(false); // Hide reel meter
        successZoneImage.gameObject.SetActive(false); // Hide success zone indicator
        isLineCast = false; // Reset the cast state
        isReeling = false; // Reset reeling state
        reelTimer = 0f; // Reset the timer
    }
}
