using UnityEngine;
using System.Collections.Generic;
using System.IO;
using Unity.VisualScripting;

[System.Serializable]
public class ListWrapper<T>
{
    public List<T> list;

    public ListWrapper(List<T> list)
    {
        this.list = list;
    }
}

public class SaveLoadManager : MonoBehaviour
{
    public Inventory inventory;
    public ShopController shopController;
    public GameManager gameManager;
    public GameTime gameTime;
    void Start()
    {
        gameManager = gameObject.GetComponent<GameManager>();
        shopController = gameObject.GetComponent<ShopController>();
        gameTime = gameObject.GetComponent<GameTime>(); 
    }


    // Save a generic list to a JSON file
    public void SaveList<T>(List<T> list, string fileName)
    {
        ListWrapper<T> wrapper = new ListWrapper<T>(list);
        string json = JsonUtility.ToJson(wrapper, true);  // Optional 'true' for pretty printing
        File.WriteAllText("Assets/Data/" + fileName + ".json", json);
    }

    // Load a generic list from a JSON file
    public List<T> LoadList<T>(string fileName)
    {
        string path = "Assets/Data/" + fileName + ".json";
        if (File.Exists(path))
        {
            string json = File.ReadAllText(path);
            ListWrapper<T> wrapper = JsonUtility.FromJson<ListWrapper<T>>(json);
            return wrapper.list;
        }
        return new List<T>();
    }

    // Specialized method for saving a list of Fish
    public void SaveFishList(List<Fish> fishList, string filename)
    {
        SaveList(fishList, filename);  // No need to re-instantiate the manager
    }

    // Specialized method for loading a list of Fish
    public List<Fish> LoadFishList(string filename)
    {
        return LoadList<Fish>(filename);
    }

    // Specialized method for saving a list of Fish
    public void SaveShopList(List<Shop> shopList, string filename)
    {
        SaveList(shopList, filename);  // No need to re-instantiate the manager
    }

    // Specialized method for loading a list of Fish
    public List<Shop> LoadShopList(string filename)
    {
        return LoadList<Shop>(filename);
    }

    public void SaveInventory(Inventory inventory, string fileName)
    {
        string json = JsonUtility.ToJson(inventory, true);  // Optional 'true' for pretty printing
        File.WriteAllText("Assets/Data/" + fileName + ".json", json);
    }

    // Load the Inventory from a JSON file
    public Inventory LoadInventory(string fileName)
    {
        string path = "Assets/Data/" + fileName + ".json";
        if (File.Exists(path))
        {
            string json = File.ReadAllText(path);
            return JsonUtility.FromJson<Inventory>(json);
        }
        return new Inventory();  // Return a new Inventory if no file exists
    }

    public void LoadPlayerPrefs()
    {
        shopController.isFishAssortmentPopulated = PlayerPrefs.GetInt("isFishAssortmentPopulated", 0) == 1;
    }


    public void SaveInventory()
    {
        SaveInventory(gameManager.inventory, "inventory");
        print("Saving.... ");
        print("Fish Dex " + gameManager.inventory.FishDex.Count);
        print("Fish Inv " + gameManager.inventory.Fish.Count);
        //saveLoadManager.SaveFishList(inventory.FishDex, "fishDex");
    }

    public void LoadInventory()
    {
        gameManager = gameObject.GetComponent<GameManager>();

        if (LoadInventory("inventory") != null)
        {
            print("Loading Inventory");
            gameManager.inventory = LoadInventory("inventory");
        }
        else
        {
            print("Inventory is null");
        }
    }

    public void LoadFishDex()
    {
        gameManager.inventory.FishDex = LoadFishList("fishDex");
    }


    public void OnApplicationQuit()
    {
        SaveInventory(gameManager.inventory, "inventory");
        //SaveShopList(shopController.shopList, "shopList");
        PlayerPrefs.SetString("tomorrowWeather", gameTime.tomorrowWeather);
        PlayerPrefs.SetString("todayWeather", gameTime.todayWeather);
        PlayerPrefs.SetInt("isFishAssortmentPopulated", shopController.isFishAssortmentPopulated ? 1 : 0);
        PlayerPrefs.Save();
        Debug.Log("SAVINGS ON CLOSE");
    }

}

