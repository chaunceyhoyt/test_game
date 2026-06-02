using System;
using System.Collections.Generic;
using System.Linq;
using Unity.VisualScripting.Antlr3.Runtime;
using Unity.VisualScripting;
using UnityEngine;
using Random = UnityEngine.Random;
using static UnityEditor.Progress;
using System.Security.Cryptography.X509Certificates;
using System.Xml.Linq;
using System.Diagnostics;
using Debug = UnityEngine.Debug;
using static UnityEngine.Analytics.IAnalytic;

public class ShopController : MonoBehaviour
{
    public SaveLoadManager saveLoadManager;
    GameManager gameManager;
    GameTime gameTime;
    Inventory inventory;
    public TemplateManager ShopTemplateManager;
    GameObject ShopInvPanel;
    GameObject eventManager;
    public GameObject ShopPanel;

    TemplateManager fishDexManager;
    TemplateManager fishInvManager;

    public List<Shop> shopList = new List<Shop>();
    public int shopID;
    public string shopName;
    public string location;
    public string shopKeeper;
    public int openingHour;
    public int closingHour;
    public List<string> enterDialogue;
    public List<string> convoDialogue;
    public List<string> exitDialogue;

    public int money;
    public int baseMoney;
    public float finalPrice;
    public float pricingMarkup;
    public float discount;



    public List<Fish> shopFishInventory = new List<Fish>();
    public List<FishingPole> shopPoleInventory = new List<FishingPole>();
    public List<Boat> shopBoatInventory = new List<Boat>();

    public List<Fish> fishAssortment = new List<Fish>();
    public List<FishingPole> poleAssortment = new List<FishingPole>();
    public List<Boat> boatAssortment = new List<Boat>();

    public int maxFishInventoryCapacity;
    public int maxPoleInventoryCapacity;

    public int selectedID;
    public Item selectedItem;
    public string selectedType;
    public bool isBuying;
    public bool isFishAssortmentPopulated = false;
    bool isOpen;
    bool soldOut;
    bool panelIsOpen;
    string message;
    string shopAction;
    bool firstOpen;

    [HideInInspector] public List<Fish> locationList = new List<Fish>();
public List<Fish> commonList = new List<Fish>();
    [HideInInspector] public List<Fish> uncommonList = new List<Fish>();
    [HideInInspector] public List<Fish> rareList = new List<Fish>();
    [HideInInspector] public List<Fish> superrareList = new List<Fish>();
    [HideInInspector] public List<Fish> legendaryList = new List<Fish>();


    public void Start()
    {
        gameTime = gameObject.GetComponent<GameTime>();
        gameManager = gameObject.GetComponent<GameManager>();
        fishDexManager = gameObject.GetComponent<TemplateManager>();
        fishInvManager = gameObject.GetComponent<TemplateManager>();
        saveLoadManager = gameObject.GetComponent<SaveLoadManager>();   
        ShopInvPanel = GameObject.Find("Shop Inventory Background");
        ShopPanel = GameObject.Find("Shop Fish Content");
        ShopTemplateManager = ShopPanel.GetComponent<TemplateManager>();
        inventory = gameManager.inventory;

        LoadShopData();
        CheckForInventoryRefresh();

        print("Shop 3 fish count = " + shopList[3].FishInventory.Count);

    }

    public void SelectShop(int id)
    {


        shopID = id;
        Restock();
        ShopInvPanel.SetActive(false);

        string bgName = "Shop";

            Animation animator = GameObject.Find("Shop Panel").GetComponent<Animation>();

            if (!panelIsOpen)
            {
                animator[bgName].speed = 1;
                animator.Play(bgName);
                panelIsOpen = true;

            }
            else
            {
                animator[bgName].speed = -1;
                animator[bgName].time = animator[bgName].length;
                animator.Play(bgName);
                panelIsOpen = false;
            }

        if (isOpen && !soldOut)
        {
            message = EnterShopDialogue();
        }
        else
        {
            print("SORRY WE ARE CLOSED");
        }

    }


    public void EnterShop(GameObject button)
    {
        string action = button.name.Replace(" Button", "");


        if (action == "Buy")
        {
            isBuying = true;
           
        }

        if (action == "Sell")
        {
            isBuying = false;
        }
        print("isBuying = " + isBuying);

        ShopInvPanel.SetActive(true);
        InitializeShopTemplates();
    }

    public void InitializeShopTemplates()
    {
        var dataList =  new List<Fish>();

        if (isBuying)
        {
            dataList = shopFishInventory;
        }
        else
        {
            dataList = inventory.Fish;
        }
        ShopTemplateManager.InitializeFishTemplates(dataList);
    }


    public void BackOutInventory()
    {
        ShopInvPanel.SetActive(false);
    }

    public string EnterShopDialogue()
    {
        int randomIndex = Random.Range(0, enterDialogue.Count);
        return enterDialogue[randomIndex];
    }

    public string ConvoShopDialogue()
    {
        int randomIndex = Random.Range(0, convoDialogue.Count);
        return convoDialogue[randomIndex];
    }

    public string ExitShopDialogue()
    {
        int randomIndex = Random.Range(0, exitDialogue.Count);
        return exitDialogue[randomIndex];
    }

    bool IsOpen()
    {
        int currentHour = System.DateTime.Now.Hour;
        return currentHour >= openingHour && currentHour < closingHour;
    }


    public void Restock()
    {
        if (gameTime.daysSinceLastBoot > 0)
        {
            //shopFishInventory.RemoveAll(fish => fishAssortment.Contains(fish));
            //shopFishInventory.AddRange(fishAssortment);
            money = baseMoney;
        }
    }




    // public void ApplyDiscount(float discountPercentage)
    // {
    // discount = discountPercentage;
    // Debug.Log($"Discount applied: {discountPercentage * 100}% off all items.");
    // }




    public void ConfirmAction(string itemType, int id, float price)
    {
        if (isBuying)
        {
            AddItemToInventory(itemType, id, price);
        }
        else
        {
            RemoveItemFromInventory(itemType, id, price);     
        }

        message = ConvoShopDialogue();
        //CanvasManager.ToggleDialoguePanel(message,false);	
    }


    //BUY ITEM
    public void AddItemToInventory(string itemType, int inventoryId, float price)
    {

        float finalPrice = price * pricingMarkup * (1 - discount);

        if (inventory.money < finalPrice)
        {
            Debug.Log("Not enough money.");
            return;
        }

        inventory.money -= finalPrice;

        switch (itemType)
        {
            case "Fish":
                if (inventory.Fish.Count() >= inventory.maxFishCapacity)
                {
                    Debug.Log("No inventory space for fish.");
                    return;
                }

                // shopFishInventory.Remove(shopFishInventory[inventoryId]);
                // inventory.Fish.Add(shopFishInventory[inventoryId]);
                fishInvManager.AddEntry(inventory.Fish.Count, inventory.Fish[inventory.Fish.Count]);
                Debug.Log("Handling a fish item.");
                break;

            case "Pole":
                if (inventory.FishingPoles.Count() >= inventory.maxFishingPolesCapacity)
                {
                    Debug.Log("no inventory space for equipment.");
                    return;
                }
                //shopPoleInventory.Remove(shopPoleInventory[inventoryId]);
                //inventory.FishingPoles.Add(shopPoleInventory[inventoryId]);
                Debug.Log("handling an equipment item.");
                break;

            default:
                Debug.Log("Unknown item type.");
                break;
        }



    }

    //SELL ITEM
    public void RemoveItemFromInventory(string itemType, int inventoryId, float price)
    {
        
        float sellPrice = price * 0.5f;

        if (money < sellPrice)
        {
            Debug.Log("Shop does not have the funds to purchase this item.");
            return;
        }

        inventory.money += sellPrice;

        switch (itemType)
        {
            case "Fish":

                if (shopList[shopID].FishInventory.Count >= maxFishInventoryCapacity)
                {
                    Debug.Log("Shop cannot accept more items.");
                    return;
                }

                inventory.Fish.Remove(inventory.Fish[inventoryId]);
                shopList[shopID].FishInventory.Add(inventory.Fish[inventoryId]);
                break;

            case "Pole":

                if (shopList[shopID].PoleInventory.Count >= maxPoleInventoryCapacity)
                {
                    Debug.Log("Shop cannot accept more items.");
                    return;
                }

                inventory.FishingPoles.Remove(inventory.FishingPoles[inventoryId]);
                shopList[shopID].PoleInventory.Add(inventory.FishingPoles[inventoryId]);
                break;

            default:
                Debug.Log("Unknown item type.");
                break;
        }
    }


    public void LoadShopData()
    {
        print("about to load shop data");
        
        var tempList = saveLoadManager.LoadShopList("shopList");


        print($"shop list is {tempList}");
        print($"shop list  {tempList.Count}");

        if (!isFishAssortmentPopulated)
        {

            print("building Shop list");

            shopList.Add(new Shop(
                id: 0,
                name: "The Bait Bucket",
                description: "A small shop near the docks specializing in live bait and fishing equipment.",
                location: "Ocean",
                shopKeeper: "Old Man Finn",
                money: 1500.0f,
                fishInventory: new List<Fish>()
            ));

            shopList.Add(new Shop(
                id: 1,
                name: "Reel Deal Tackle",
                description: "A well-known tackle shop with a large selection of rods, reels, and rare lures.",
                location: "Ocean",
                shopKeeper: "Sally Hook",
                money: 3000.0f,
                fishInventory: new List<Fish>()
            ));

            shopList.Add(new Shop(
                id: 2,
                name: "Deep Blue Emporium",
                description: "Specializing in deep-sea fishing gear and premium equipment for experienced anglers.",
                location: "Ocean",
                shopKeeper: "Captain Marlin",
                money: 5000.0f,
                fishInventory: new List<Fish>()
            ));

            shopList.Add(new Shop(
                id: 3,
                name: "Catch & Release Co.",
                description: "A sustainable shop that focuses on catch-and-release gear and eco-friendly equipment.",
                location: "Ocean",
                shopKeeper: "Luna Wave",
                money: 2000.0f,
                fishInventory: new List<Fish>()
            ));
        }

        if (isFishAssortmentPopulated)
        {
           shopList = tempList;
        }
    }


    public void SaveShopInventories()
    {
        saveLoadManager.SaveShopList(shopList, "shopList");
    }

    public void RestockShops()
    {






    }


    public void CheckForInventoryRefresh()
    {
        if (!isFishAssortmentPopulated)
        {
            for (int i = 0; i < shopList.Count; i++)
            {
                shopID = i;
                PopulateFishAssortmentList();
            }
            isFishAssortmentPopulated = true;

            SaveShopInventories();
            PlayerPrefs.SetInt("isFishAssortmentPopulated", isFishAssortmentPopulated ? 1 : 0);
        }
    }


    ///GET FISH ASSORTMENT
    public void PopulateFishAssortmentList()
    {
        FilterAndAddFishToList("COMMON", commonList);
        FilterAndAddFishToList("UNCOMMON", uncommonList);
        FilterAndAddFishToList("RARE", rareList);
        FilterAndAddFishToList("SUPER RARE", superrareList);

        PopulateTempLists();
        print("Shop Inventory Filled");
    }

    void FilterAndAddFishToList(string rarity, List<Fish> targetList)
    {
        foreach (var fish in gameManager.fishList)
        {
            bool seasonMatch = fish.seasons.Contains(gameTime.season) || fish.seasons.Contains("ANY");

            if ((fish.locations.Contains(shopList[shopID].locations) || fish.locations.Contains("ANY")) &&
                fish.rarity == rarity && (seasonMatch || fish.seasons.Any(fishSeason => fishSeason == "ANY")))
            {
                targetList.Add(fish);
                Debug.Log($"Location temp: {fish.id}");
            }
        }
    }

    void PopulateTempLists()
    {
        int commonpick = Random.Range(1, 5);
        int uncommonpick = Random.Range(1, 4);
        int rarepick = Random.Range(0, 2);
        int superrarepick = Random.Range(0, 1);

        AddFishFromList(commonList, commonpick);
        AddFishFromList(uncommonList, uncommonpick);
        AddFishFromList(rareList, rarepick);
        AddFishFromList(superrareList, superrarepick);
    }

    void AddFishFromList(List<Fish> sourceList, int numberOfPicks)
    {

        print("addfish sortList = " + sourceList.Count);

        print("shop id = " + shopID);



        int count = sourceList.Count-1;
        if (count > 0)
        {
            for (int i = 0; i < numberOfPicks; i++)
            {
                int pick = Random.Range(0, count);
                shopList[i].FishInventory.Add(sourceList[pick]);
                Debug.Log($"Final temp: {sourceList[pick].id}");
            }
            sourceList.Clear();
        }
    }











}
