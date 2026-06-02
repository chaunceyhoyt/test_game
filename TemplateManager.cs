using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System.Linq;
using Unity.VisualScripting;
using NUnit.Framework;
using Unity.VisualScripting.Antlr3.Runtime.Tree;
using System.Globalization;
using static UnityEngine.EventSystems.EventTrigger;

public class TemplateManager : MonoBehaviour
{
    public List<object> templateList;
    GameObject TemplatePrefab;
    public string type;
    GameObject ScrollContent;
    GameObject[] entries;
    bool showCaughtOnly = false;
    bool weightAccending;
    bool nameAccending;
    bool idAccending;
    string sortMethod = "id";

    public void Start()
    {
        TemplatePrefab = Resources.Load<GameObject>("Prefabs/TemplatePrefab");
        ScrollContent = gameObject;
    }


    public void InitializeTemplates(List<object> tempList)
    {

        if (typeof(object) == typeof(Fish))
        {
            var fishList = tempList.Cast<Fish>().ToList();
            InitializeFishTemplates(fishList);
        }
        else if (typeof(object) == typeof(FishingPole))
        {
            var poleList = tempList.Cast<FishingPole>().ToList();
            InitializePoleTemplates(poleList);
        }
        else if (typeof(object) == typeof(Boat))
        {
            var boatList = tempList.Cast<Boat>().ToList();
            InitializeBoatTemplates(boatList);
        }
    }



    public void InitializeFishTemplates(List<Fish> tempList)
    {
        templateList = tempList.Cast<object>().ToList();
        CreateEntries();
    }


    public void InitializePoleTemplates(List<FishingPole> tempList)
    {
        templateList = tempList.Cast<object>().ToList();
        CreateEntries();
    }

    public void InitializeBoatTemplates(List<Boat> tempList)
    {
        templateList = tempList.Cast<object>().ToList();
        CreateEntries();
    }





    public void CreateEntries()
    {
        ClearGameObjects();

        for (var z = 0; z < templateList.Count(); z++)
        {
            GameObject entry = Instantiate(TemplatePrefab);
            TransferTemplateData(z, entry);
        }

        entries = GameObject.FindGameObjectsWithTag(type);

        foreach (GameObject entry in entries)
        {
            entry.GetComponent<Template>().InitialilzeTemplate();
        }
    }
	
	
	public void AddEntry(int id,object item)
    {
        GameObject entry = Instantiate(TemplatePrefab);
        Template template = entry.GetComponent<Template>();

        if (item is Fish fish)
        {
            print("IS FISH");
            template.Fish = fish;
            entry.name = (type + " " + fish.id);
            template.type = "Fish";
        }
        else if (item is FishingPole pole)
        {
            print("IS FISHPOLE");
            template.Pole = pole;
            //template.FishingPole = templateList[z] as FishingPole;
            entry.name = (type + " " + pole.id);
            template.type = "FishingPole";
        }
        template.Fish.inventoryID = id;
        template.entryType = type;
        entry.tag = type;
        print("you added a " + type);
        template.InitialilzeTemplate();
        //SortFishList(inventory.Fish,sortMethod);
    }
	

    public void TransferTemplateData(int z, GameObject entry)
    {
        Template template = entry.GetComponent<Template>();

        if (templateList[z] is Fish fish && templateList != null)
        { 
            print("IS FISH");
            fish = templateList[z] as Fish;
            template.Fish = fish;
            entry.name = (type + " " + fish.id);
            template.type = "Fish";
        }
        else if (templateList[z] is FishingPole pole && templateList != null)
        {
            print("IS FISHPOLE");
            template.Pole = pole;
            //template.FishingPole = templateList[z] as FishingPole;
            entry.name = (type + " " + pole.id);
            template.type = "FishingPole";
        }
        template.Fish.inventoryID = z;
        template.entryType = type;
        entry.tag = type;
        template.InitialilzeTemplate();
        print("you added a " + type);
    }

    public void RefreshEntries()
    {
        GameObject[] entries = GameObject.FindGameObjectsWithTag(type);

        for (int z = 0; z < entries.Length; z++)
        {
            GameObject entry = entries[z];

            if (entry.GetComponent<Template>().entryType == type)
            {
                TransferTemplateData(z, entry);
            }
        }
    }

    public void ShowCaughtOnlyToggle()
    {
        if (!showCaughtOnly)
        {
            showCaughtOnly = true;
        }
        else
        {
            showCaughtOnly = false;
        }
        ClearGameObjects();
        CreateEntries();
    }


    public void ClearGameObjects()
    {
        entries = new GameObject[ScrollContent.transform.childCount];
        for (int i = 0; i < ScrollContent.transform.childCount; i++)
        {
            Destroy(ScrollContent.transform.GetChild(i).gameObject);
        }
    }



    public void SortTemplates<T>(List<T> templateList, string sortBy)
    {
        if (typeof(T) == typeof(Fish))
        {
            // Safely cast templateList to List<Fish> and sort
            var fishList = templateList.Cast<Fish>().ToList();
            SortFishList(fishList, sortBy);
        }
        else if (typeof(T) == typeof(FishingPole))
        {
            // Safely cast templateList to List<FishingPole> and sort
            var fishingPoleList = templateList.Cast<FishingPole>().ToList();
            //SortFishingPoleList(fishingPoleList, sortBy);
        }
        else if (typeof(T) == typeof(Boat))
        {
            // Safely cast templateList to List<FishingPole> and sort
            var boatList = templateList.Cast<Boat>().ToList();
            //SortBoatList(fishingPoleList, sortBy);
        }
        else
        {
            Debug.LogError("Unsupported type for sorting");
        }
    }


    public void SortFishList(List<Fish> templateList, string sortBy)
    {
        bool ascending = sortMethod != sortBy || !weightAccending;

        sortMethod = sortBy;

        switch (sortBy)
        {
            case "weight":
                templateList = ascending ? templateList.OrderBy(w => w.weight).ToList() : templateList.OrderByDescending(w => w.weight).ToList();
                weightAccending = ascending;
                break;

            case "name":
                templateList = ascending ? templateList.OrderBy(w => w.name).ToList() : templateList.OrderByDescending(w => w.name).ToList();
                nameAccending = ascending;
                break;

            case "id":
                templateList = ascending ? templateList.OrderBy(w => w.id).ToList() : templateList.OrderByDescending(w => w.id).ToList();
                idAccending = ascending;
                break;

            case "uniqueID":
                templateList = ascending ? templateList.OrderBy(w => w.uniqueID).ToList() : templateList.OrderByDescending(w => w.uniqueID).ToList();
                idAccending = ascending;
                break;

            case "price":
                templateList = ascending ? templateList.OrderBy(w => w.price).ToList() : templateList.OrderByDescending(w => w.price).ToList();
                idAccending = ascending;
                break;

            default:
                Debug.Log("Unknown sort type");
                return;
        }

        RefreshEntries();
    }

    public void SortPoleList(List<Fish> templateList, string sortBy)
    {
        bool ascending = sortMethod != sortBy || !weightAccending;

        sortMethod = sortBy;

        switch (sortBy)
        {
            case "weight":
                templateList = ascending ? templateList.OrderBy(w => w.weight).ToList() : templateList.OrderByDescending(w => w.weight).ToList();
                weightAccending = ascending;
                break;

            case "name":
                templateList = ascending ? templateList.OrderBy(w => w.name).ToList() : templateList.OrderByDescending(w => w.name).ToList();
                nameAccending = ascending;
                break;

            case "id":
                templateList = ascending ? templateList.OrderBy(w => w.id).ToList() : templateList.OrderByDescending(w => w.id).ToList();
                idAccending = ascending;
                break;

            case "uniqueID":
                templateList = ascending ? templateList.OrderBy(w => w.uniqueID).ToList() : templateList.OrderByDescending(w => w.uniqueID).ToList();
                idAccending = ascending;
                break;

            case "price":
                templateList = ascending ? templateList.OrderBy(w => w.price).ToList() : templateList.OrderByDescending(w => w.price).ToList();
                idAccending = ascending;
                break;

            default:
                Debug.Log("Unknown sort type");
                return;
        }

        RefreshEntries();
    }


}
