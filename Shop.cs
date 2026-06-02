using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class Shop
{
    // STATIC FIELDS
    public int id; // Unique identifier for the location
    public string name; // Name of the location
    public string description; // Description of the location
    public string locations;
    public string shopKeeper;
    public float money;
    public List<Fish> FishInventory;
    public List<FishingPole> PoleInventory;
    public List<Boat> BoatInventory;

    // FULL CONSTRUCTOR
    public Shop(int id, string name, string description, string location, string shopKeeper, float money, List<Fish> fishInventory)
    {
        this.id = id;
        this.name = name;
        this.description = description;
        this.locations = location;
        this.shopKeeper = shopKeeper;
        this.money = money;
        this.FishInventory = fishInventory;
    }

}