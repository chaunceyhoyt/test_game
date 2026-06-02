using System;
using System.Collections.Generic;
using UnityEngine;
using System.IO;


[Serializable]
public class Inventory
{
	public List<Fish> FishDex; //Primary List Of Fish 
    public List<Fish> Fish; // List of players Fish
    public List<Achievement> Achievements; // List of players achievements
    public List<FishingPole> FishingPoles; // List of players poles
    public List<Boat> Boats; // List of players boats

    public int maxFishCapacity = 20; // Maximum number of fish that can be stored
    public int maxFishingPolesCapacity =1; // Maximum number of fishing poles
    public int maxBoatsCapacity = 1; // Maximum number of boats

    public FishingPole equippedFishingPole = new FishingPole(); // Currently equipped fishing pole
    public Boat equippedBoat = new Boat(); // Currently equipped boat

    public float money = 100; // Amount of money
    public float fuel = 100; // Amount of fuel

    public int uniqueID = 1;
    public bool showCaughtOnly = false;

}




