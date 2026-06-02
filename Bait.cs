using System;
using System.Collections.Generic;
using UnityEngine;


public class Bait
{
    public int id; // Unique identifier for the bait
    public string name; // Name of the bait
    public string description; // Description of the bait
    public int price; // Cost of the bait
    public int isEquipped; // Whether the bait is currently equipped (1 for true, 0 for false)
    public enum BaitType
    {
        Worm,
        Lure,
        Fly,
        Minnow,
        Dough
    }
    public BaitType baitType; // Type of bait
    public float effectiveness; // Effectiveness of the bait (0-100%)
    public int durability; // Number of uses remaining
    public float size; // Size of the bait (in centimeters, for example)
    public Color color; // Color of the bait
    public List<string> preferredFishTypes; // List of fish species names that are attracted to this bait
    public enum Rarity
    {
        Common,
        Uncommon,
        Rare,
        Legendary
    }
    public Rarity rarity; // Rarity of the bait 
    public int fishingSkillRequired; // Fishing skill level required to use the bait effectivel
    public float weight; // Weight of the bait (in grams or ounces) 
    public float condition; // Freshness or condition of the bait (0-100%)
    public string specialEffects; // Description of any special effects the bait has
    public DateTime expiryDate; // Expiry date of the bait
    public int unlockLevel; // Level or achievement required to unlock or use this bait
    public Dictionary<string, int> craftingIngredients; // Ingredients required to craft this bait (item name and quantity)
    public int usageCount; // Number of times the bait has been used
}