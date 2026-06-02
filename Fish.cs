using System;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.UI;

[Serializable]
public class Fish
{
    //STATIC FIELDS
    ///fishdex index
    public int id;
    ///player/shop inventory index
    public int inventoryID;
    ///unique fish id 
    public int uniqueID;
    public string itemType;
    public string name;
    public string description;
    public List<string> locations;
    public string rarity;
    public List<string> seasons;
    public List<string> events;
    public List<string> time;
    public float minWeight;
    public float maxWeight;
    public float minDepth;
    public float maxDepth;
    public Image fishsprite;
    public Image isGoldSprite;
    public DateTime dateAdded;

    //DYNAMIC FIELDS
    public float weight;
    public float price;
    public int hasCaught;
    public int hasSeen;
    public int isGold;
}