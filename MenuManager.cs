using Unity.VisualScripting.Antlr3.Runtime;
using Unity.VisualScripting.Antlr3.Runtime.Collections;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.UI;
using static System.Net.Mime.MediaTypeNames;
using UnityEngine.UIElements;
using System.Linq;
using System.Collections;


public class MenuManager : MonoBehaviour
{
    public TackleBox tackleBox; 
    public GameManager gameManager;
    public LocationFishFill locationFill;
    public Inventory inventory;
    public Fish randomFish;
    public Animation animator;
    public string bgName;
    public string prevbg;
    public bool isOpen = false;
    public bool isMapOpen = false;
    public bool settingsOpen = false;
    int slotPick;
    float minWeight;
    float maxWeight;
    float randomWeight;
    UnityEngine.UI.Button button;

    public void BUTTON()
    {
      GetRandomFish();
    }

    void GetRandomFish()
    {    
        if (gameManager.fishList.Count == 0)
        {
            Debug.LogError("FishList is empty!");
            return;
        }



        int randomIndex = UnityEngine.Random.Range(0, gameManager.fishList.Count);
        randomFish = gameManager.fishList[randomIndex];
        DisplayFishInfo(randomFish);
    }

    void DisplayFishInfo(Fish fish)
    {
        Debug.LogError("DISPLAY FISH!");

        string fishInfo = $"Random Fish: {fish.name}\n" +
                          $"Description: {fish.description}\n" +
                          $"Location(s): {string.Join("| ", fish.locations)}\n" +
                          $"Rarity: {fish.rarity}\n" +
                          $"Season(s): {string.Join("| ", fish.seasons)}\n" +
                          $"Event(s): {string.Join("| ", fish.events)}\n" +
                          $"Time(s): {string.Join("| ", fish.time)}\n" +
                          $"Weight Range: {fish.minWeight} - {fish.maxWeight} kg\n" +
                          $"Depth Range: {fish.minDepth} - {fish.maxDepth} meters\n" +
                          $"Price: {fish.price} currency units\n";

        Debug.Log(fishInfo);
    }



    public void ToggleMenu(GameObject button)
    {
        bgName = button.name.Replace("Button", "Background");

        // Main menu animator is always from "Menu Panel"
        animator = GameObject.Find("Menu Panel").GetComponent<Animation>();

        if (!isOpen)
        {
            animator[bgName].speed = 1;
            animator.Play(bgName);
            isOpen = true;
        }
        else
        {
            animator[bgName].speed = -1;
            animator[bgName].time = animator[bgName].length;
            animator.Play(bgName);
            isOpen = false;
        }
    }

    public void ToggleSettings(GameObject button)
    {
        bgName = button.name.Replace("Button", "Background");

        // Settings panel is its own object
        animator = GameObject.Find(bgName).GetComponent<Animation>();

        if (!settingsOpen)
        {
            animator[bgName].speed = 1;
            animator.Play(bgName);
            settingsOpen = true;
        }
        else
        {
            animator[bgName].speed = -1;
            animator[bgName].time = animator[bgName].length;
            animator.Play(bgName);
            settingsOpen = false;
        }
    }

    public void ToggleMap(GameObject button)
    {
        bgName = button.name.Replace("Button", "Background");

        // Main menu animator is always from "Menu Panel"
        animator = GameObject.Find("Menu Panel").GetComponent<Animation>();

        if (!isOpen)
        {
            animator[bgName].speed = 1;
            animator.Play(bgName);
            isMapOpen = true;
        }
        else
        {
            animator[bgName].speed = -1;
            animator[bgName].time = animator[bgName].length;
            animator.Play(bgName);
            isMapOpen = false;
        }
    }




    public void GetRandomFish2()
    {
        if (locationFill.locationList.Count > 0)
        {
            var randomChance = Random.Range(0, 255);


            if (randomChance == 0)
            { slotPick = 0; }
            if (randomChance >= 1 && randomChance <= 50)
            { slotPick = 1; }
            if (randomChance >= 51 && randomChance <= 101)
            { slotPick = 2; }
            if (randomChance >= 102 && randomChance <= 140)
            { slotPick = 3; }
            if (randomChance >= 141 && randomChance <= 165)
            { slotPick = 4; }
            if (randomChance >= 166 && randomChance <= 190)
            { slotPick = 5; }
            if (randomChance >= 191 && randomChance <= 215)
            { slotPick = 6; }
            if (randomChance >= 216 && randomChance <= 228)
            { slotPick = 7; }
            if (randomChance >= 229 && randomChance <= 241)
            { slotPick = 8; }
            if (randomChance >= 242 && randomChance <= 252)
            { slotPick = 9; }
            if (randomChance >= 253 && randomChance <= 255)
            { slotPick = 10; }
            //Debug.Log("Random Chance is " + randomChance);
            //Debug.Log("Slot Pick is " + slotPick);
            //Debug.Log(slotPick + " " + locationFill.locationFill.locationList[slotPick].name);
            //catchID = locationFill.locationList[slotPick].id;
            GetWeight();
            AddFish(locationFill.locationList[slotPick]);
        }

        Debug.Log("NO FISH");
    }


    void GetWeight()
    {

        minWeight = locationFill.locationList[slotPick].minWeight;
        maxWeight = locationFill.locationList[slotPick].maxWeight;

        //if (maxweight > equippedMaxWeight) {
        //maxWeight = equippedMaxWeight;
        //}


        randomWeight = Random.Range(minWeight, maxWeight);
        locationFill.locationList[slotPick].weight = randomWeight;
        Debug.Log("weight is " + randomWeight);

    }

    void AddFish(Fish original)
    {
        Fish clone = new Fish();
        clone.id = original.id;
        clone.name = original.name;
        clone.locations = original.locations;
        clone.rarity = original.rarity;
        clone.seasons = original.seasons;
        clone.time = original.time;
        clone.weight = original.weight;
        clone.minWeight = original.minWeight;
        clone.maxWeight = original.maxWeight;
        clone.description = original.description;
        clone.hasCaught = 1;
        clone.inventoryID = inventory.Fish.Count() + 1;
        inventory.Fish.Add(clone);


        for (var z = 0; z < inventory.FishDex.Count(); z++)
        {
            if (inventory.FishDex[z].id == locationFill.locationList[slotPick].id)
            {
                inventory.FishDex[z].hasCaught = 1;
            }
        }

        Debug.Log("You caught a " + locationFill.locationList[slotPick].id + " that weighs " + locationFill.locationList[slotPick].weight + " units.");
        //text.text = "You caught a " + locationFill.locationList[slotPick].id + " that weighs " + locationFill.locationList[slotPick].weight + " units.";
       //panels.ExitReelBattle();
    }





}


