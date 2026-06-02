using System;
using System.Collections.Generic;
using UnityEngine;


[Serializable]
public class FishingPole
{

    public int id;
    public string itemType;
    public string name;
    public string description;
    public int price; // Cost of the fishing pole
    public string type; // Type of fishing pole
    public string material; // Material of the fishing pole
    public float length; // Length of the fishing pole
    public string power; // Power rating
    public string action; // Action type
    public int durability; // Durability percentage
    public float weight; // Weight of the fishing pole
    public float lineCapacity; // Maximum line capacity
    public string reelType; // Type of reel
    public List<string> specialFeatures; // Special features
    public bool isEquipped; // Whether the pole is equipped
    public float condition; // Condition percentage
    public List<string> upgradeOptions; // Possible upgrades
    public string owner; // Owner of the fishing pole
    public int usageHistory; // Number of times used
}