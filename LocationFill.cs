using System;
using Unity.VisualScripting.Antlr3.Runtime.Collections;
using UnityEditor.PackageManager.UI;
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Random = UnityEngine.Random;
using UnityEditor.Build.Content;

public class LocationFishFill : MonoBehaviour
{
    public GameManager gameManager;
    public GameTime gameTime;
    public LocationSelect locationSelect;
	public WaterDepthCalculator depthCalc;

    public List<Fish> locationList = new List<Fish>();
    public List<Fish> commonList = new List<Fish>();
    public List<Fish> uncommonList = new List<Fish>();
    public List<Fish> rareList = new List<Fish>();
    public List<Fish> superrareList = new List<Fish>();
    public List<Fish> legendaryList = new List<Fish>();

    private void Start()
    {
            gameManager = gameObject.GetComponent<GameManager>();
            gameTime = gameObject.GetComponent<GameTime>();
            locationSelect = gameObject.GetComponent<LocationSelect>();
			depthCalc = gameObject.GetComponent<WaterDepthCalculator>();
    }

    public void PopulateLocationList()
    {
        FilterAndAddFishToList("LEGENDARY", legendaryList);
        FilterAndAddFishToList("COMMON", commonList);
        FilterAndAddFishToList("UNCOMMON", uncommonList);
        FilterAndAddFishToList("RARE", rareList);
        FilterAndAddFishToList("SUPER RARE", superrareList);

        PopulateTempLists();

        print(gameTime.timeOfDay);
        print(gameTime.season);
        print("Location List Filled");
    }

    void FilterAndAddFishToList(string rarity, List<Fish> targetList)
    {
        foreach (var fish in gameManager.fishList)
        {
            bool seasonMatch = fish.seasons.Contains(gameTime.season) || fish.seasons.Contains("ANY");
            bool locationMatch = fish.locations.Contains(locationSelect.playerLocation) || fish.locations.Contains("ANY");
            bool timeMatch = fish.time.Contains(gameTime.timeOfDay) || fish.time.Contains("ANY");
			//bool depthMatch = depthCalc.depthInMeters >= fish.minDepth && depthCalc.depthInMeters <= fish.maxDepth;


            if (locationMatch && fish.rarity == rarity && seasonMatch && timeMatch)
            { 
                targetList.Add(fish);
                //Debug.Log($"Location temp: {fish.id}");
            }
        }
    }

    void PopulateTempLists()
    {
    AddFishFromList(legendaryList, 1);
    AddFishFromList(commonList, 3);
    AddFishFromList(uncommonList, 3);
    AddFishFromList(rareList, 2);
    AddFishFromList(superrareList, 2);
    }

    void AddFishFromList(List<Fish> sourceList, int numberOfPicks)
    {
        int count = sourceList.Count;
          if (count > 0)
            {
                for (int i = 0; i < numberOfPicks; i++)
                {
                int pick = Random.Range(0, count);
                locationList.Add(sourceList[pick]);
                //Debug.Log($"Final temp: {sourceList[pick].id}");
                }
          sourceList.Clear();
          }

        //Debug.Log($"Location count = {locationList.Count()}");
    }






}
