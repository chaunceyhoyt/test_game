using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;

public class FishSelect : MonoBehaviour
{
    public Fish selectedFish;
    public GameManager gameManager;

    [SerializeField] private GameObject fishDexPanel;
    [SerializeField] private GameObject inventoryPanel;

    private TemplateManager fishDexManager;
    private TemplateManager fishInvManager;
    private Inventory inventory;
    private LocationFishFill locationFish;

    private List<Fish> filteredList;
    private string rarity;
    private float randomWeight;

    private Dictionary<string, int> rarityWeights = new Dictionary<string, int>()
    {
        { "LEGENDARY", 1 },   // 0.25%
        { "SUPERRARE", 10 },  // 2.5%
        { "RARE", 20 },       // 5%
        { "UNCOMMON", 120 },  // 30%
        { "COMMON", 249 }     // 62.25%
    };

    private void Start()
    {
        gameManager = GetComponent<GameManager>();
        locationFish = GetComponent<LocationFishFill>();
        inventory = gameManager.inventory;

        fishDexManager = fishDexPanel.GetComponent<TemplateManager>();
        fishInvManager = inventoryPanel.GetComponent<TemplateManager>();
    }

    public void SelectFish()
    {
        rarity = RollRarity();
        filteredList = locationFish.locationList.Where(f => f.rarity == rarity).ToList();

        if (filteredList.Count == 0)
        {
            Debug.LogWarning($"No fish found with rarity: {rarity}");
            return;
        }

        int pick = UnityEngine.Random.Range(0, filteredList.Count);
        Fish original = filteredList[pick];

        GetWeight(original);
        CreateAndCatchFish(original);
    }

    private string RollRarity()
    {
        int total = rarityWeights.Values.Sum();
        int roll = UnityEngine.Random.Range(0, total);
        int cumulative = 0;

        foreach (var pair in rarityWeights)
        {
            cumulative += pair.Value;
            if (roll < cumulative)
                return pair.Key;
        }

        return "COMMON"; // Fallback
    }

    private void GetWeight(Fish fish)
    {
        randomWeight = UnityEngine.Random.Range(fish.minWeight, fish.maxWeight);
    }

    private void CreateAndCatchFish(Fish original)
    {
        Fish clone = new Fish
        {
            id = original.id,
            name = original.name,
            locations = original.locations,
            rarity = original.rarity,
            seasons = original.seasons,
            time = original.time,
            weight = randomWeight,
            minWeight = original.minWeight,
            maxWeight = original.maxWeight,
            description = original.description,
            uniqueID = inventory.uniqueID++,
            hasCaught = 1,
            inventoryID = inventory.Fish.Count,
            dateAdded = DateTime.Now
        };

        inventory.Fish.Add(clone);
        inventory.FishDex[clone.id].hasCaught = 1;

        selectedFish = clone;

        // Update UI
        fishDexManager.RefreshEntries();
        fishInvManager.AddEntry(clone.inventoryID, clone);

        // Fire global game event
        GameEvents.TriggerFishCaught(clone);

        Debug.Log($"You caught a {clone.name} that weighs {clone.weight:F2} units.");
    }
}
