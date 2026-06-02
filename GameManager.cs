using System.Collections.Generic;
using System.IO;
using UnityEngine;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Linq;
using System;
using NUnit.Framework;

[System.Serializable]
public class GameManager : MonoBehaviour
{
    GameTime gameTime;
    string csvFilePath = "Assets/Data/FISH.csv"; // Path to your CSV file
    public List<Fish> fishList = new List<Fish>();
    [HideInInspector] public List<Season> seasonList;
    public TemplateManager FishDexTemplateManager;
    public TemplateManager InventoryTemplateManager;
    public ShopController shopController;
    public GameObject FishDexPanel;
    public GameObject InventoryPanel;
    public LocationFishFill locationFill;
    public Inventory inventory = new Inventory();
    public SaveLoadManager saveLoadManager;
    public int selectedID;
    public List<object> selectedList;
    public int selectedListCount;
    public int selectedShopID;
    public bool MenuOpen;

    void Start()
    {
        //Initialize Scripts
        GameObject eventsys = gameObject;
        gameTime = gameObject.GetComponent<GameTime>();
        locationFill = gameObject.GetComponent<LocationFishFill>();
        shopController = gameObject.GetComponent<ShopController>();
        saveLoadManager = gameObject.GetComponent<SaveLoadManager>();
        //Initialize ScrollContent
        FishDexPanel = GameObject.Find("FishDex Content");
        InventoryPanel = GameObject.Find("Inventory Content");
        //Initialize TemplateManagers
        FishDexTemplateManager = FishDexPanel.GetComponent<TemplateManager>();
        InventoryTemplateManager = InventoryPanel.GetComponent<TemplateManager>();
        //Load Fish Data CSV
        LoadFishData(csvFilePath);
        print("data count " + fishList.Count());
        inventory.FishDex = fishList;
        print("dex count " + inventory.FishDex.Count());
        //Load Saved FishDex Data
        // LoadFishDex();
        //Load Additional Fish from game updates
        // UpdateFishDexList();
        //Load Inventory
        saveLoadManager.LoadInventory();
        print("inventory count " + inventory.Fish.Count());
        //Load FishDex & Inventory Templates
        FishDexTemplateManager.InitializeFishTemplates(inventory.FishDex);
        if (inventory.Fish != null)
        {
            print("Loading Inventory Templates");
            InventoryTemplateManager.InitializeFishTemplates(inventory.Fish);
        }
        //Initialize Weather
        //Load Location Fish List
        locationFill.PopulateLocationList();
        SetSelectedListInv();

    }

    public void LoadFishData(string filePath)
    {
        using (var reader = new StreamReader(filePath))
        using (var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)))
        {

            csv.Read();
            csv.ReadHeader();

            while (csv.Read())
            {
                var fish = new Fish()
                {
                    id = csv.GetField<int>("id"),
                    name = csv.GetField<string>("name"),
                    description = csv.GetField<string>("description"),
                    locations = csv.GetField<string>("locations").Split('|').ToList(),
                    rarity = csv.GetField<string>("rarity"),
                    seasons = csv.GetField<string>("seasons").Split('|').ToList(),
                    //events = csv.GetField<string>("events").Split('|').ToList(),
                    time = csv.GetField<string>("timeofday").Split('|').ToList(),
                    minWeight = csv.GetField<float>("minweight"),
                    maxWeight = csv.GetField<float>("maxweight"),
                    minDepth = csv.GetField<float>("mindepth"),
                    maxDepth = csv.GetField<float>("maxdepth")
                    //uniqueID = csv.GetField<int>("uniqueID"),
                    //inventoryID = csv.GetField<int>("inventoryID"),
                    //weight = csv.GetField<float>("weight"),
                    //price = csv.GetField<float>("price"),
                    //hasCaught = csv.GetField<int>("hasCaught"),
                    //hasSeen = csv.GetField<int>("hasSeen"),
                    //isGold = csv.GetField<int>("isGold")
                };

                fishList.Add(fish);
            }
        }
    }

    void UpdateFishDexList()
    {
        // Create a HashSet of existing fish IDs
        var existingFishIds = new HashSet<int>(inventory.FishDex.Select(f => f.id));

        // Filter fishList to get only new fish
        var newFish = fishList.Where(f => !existingFishIds.Contains(f.id)).ToList();

        // Add new fish to inventory.Fish
        inventory.FishDex.AddRange(newFish);
    }

    public void SetSelected(int id,List<object> list)
    {
        selectedID = id;
        selectedList = list;
        selectedListCount = list.Count;
    }

    public void SetSelectedID(int id)
    {
        selectedID = id;
    }

    public void SetSelectedList(List<object> list)
    {
        selectedList = list;
        selectedListCount = list.Count;
    }
    public void SetSelectedListInv()
    {
        selectedList = inventory.Fish.Cast<object>().ToList();
        selectedListCount = selectedList.Count;
    }

    public void SetSelectedListDex()
    {
        selectedList = inventory.FishDex.Cast<object>().ToList();
        selectedListCount = selectedList.Count;
    }







}
