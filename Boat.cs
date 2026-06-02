using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class Boat
{
    public int id; // Unique identifier for the boat
    public string name; // Name of the boat
    public string description; // Description of the boat
    public int maxweight; // Maximum weight capacity
    public int price; // Cost of the boat
    public int isEquipped; // Whether the boat is currently equipped (1 for true, 0 for false)
    public int equippedBait; // ID of the bait currently equipped
    public string boatType; // Type of the boat
    public int passengerCapacity; // Number of passengers the boat can hold
    public float maxSpeed; // Maximum speed of the boat
    public int durability; // Durability of the boat
    public float fuelCapacity; // Maximum amount of fuel the boat can hold
    public float currentFuelLevel; // Current amount of fuel
    public string engineType; // Type of engine
    public List<string> specialFeatures; // Special features of the boat
    public float condition; // Condition of the boat
    public Color color; // Color of the boat
    public string owner; // Owner of the boat
    public int maintenanceCost; // Cost to maintain or repair the boat
    public List<string> upgradeOptions; // Available upgrades or modifications
    public float boatSize; // Size of the boat
    public string hullMaterial; // Material of the hull
    public int gearStorageCapacity; // Storage capacity for fishing gear
}