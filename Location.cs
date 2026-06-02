using System;
using System.Collections.Generic;
using UnityEngine;


[Serializable]
public class Location : MonoBehaviour
{
    // STATIC FIELDS
    public int Id; // Unique identifier for the location
    public string Name; // Name of the location
    public string Description; // Description of the location
    
    // Additional Parameters
    public Vector3 coordinates; // Coordinates in 3D space (or Vector2 for 2D games)
    public string waterConditions;
    public enum LocationType
    {
        Lake,
        River,
        Ocean,
        Forest,
        Desert,
        Mountain
    }
    public LocationType type; // Type of location

    public string accessibility; // How to access the location (e.g., requires specific equipment)
    public List<string> resources; // Resources or items found in the location
    public List<string> fauna; // Wildlife or fish types found in the location
    public string climate; // Climate or weather conditions of the location
    public List<string> challenges; // Challenges or hazards present in the location
    public bool isQuestRelated; // Whether the location is related to quests
    public List<string> npcs; // NPCs found at the location
    public List<string> seasonalAvailability; // Seasons when the location is available
    public List<string> landmarks; // Notable landmarks or points of interest
    public int difficultyLevel; // Difficulty level of the location (e.g., 1-10)
    public string region; // Broader region or area name
}