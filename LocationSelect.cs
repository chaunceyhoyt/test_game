using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System.Linq;

public class LocationSelect : MonoBehaviour
{
     public LocationFishFill locationFill;
     public GameManager gameManager;
     public Inventory inventory;

    [HideInInspector] private Text fuelText;
    [HideInInspector] private Text timeText;
    [HideInInspector] private Text confirmText;
    [HideInInspector] private Button startPOS;
    [HideInInspector] private Button endPOS;
    [HideInInspector] private GameObject keyStart;
    [HideInInspector] private GameObject keyEnd;

    public string playerLocation;
    public string selectedLocation;

    private float speed = 5f;
    private float fuelRate = 1f;
    private float travelTime;
    private float fuelCost;
    private float distance;
    private bool isOk;

    private void Start()
    {
        gameManager = gameObject.GetComponent<GameManager>();
        locationFill = gameObject.GetComponent<LocationFishFill>();
        inventory = gameManager.inventory;
    }


    // Player selects location
    public void SelectLocation(Button button)
    {
        endPOS = button;
        selectedLocation = button.name;

        if (playerLocation == selectedLocation)
        {
            locationFill.PopulateLocationList();
            return;
        }

        CalculateTravel();
    }

    private void CalculateTravel()
    {
        distance = CalculateDistance(startPOS.transform.position, endPOS.transform.position);
        fuelCost = distance * fuelRate;
        travelTime = distance / speed;

        DisplayTravelConfirmation();
    }

    private float CalculateDistance(Vector3 startPos, Vector3 endPos)
    {
        float dist = Vector3.Distance(startPos, endPos);
        float keyDist = Vector3.Distance(keyStart.transform.position, keyEnd.transform.position);
        return dist / keyDist;
    }

    private void DisplayTravelConfirmation()
    {
        fuelText.text = fuelCost.ToString("F2");

        if (inventory.fuel < fuelCost)
        {
            confirmText.text = "Not enough fuel!";
            isOk = false;
        }
        else
        {
            confirmText.text = "Confirm travel?";
            isOk = true;
        }
    }

    public void CancelTravel()
    {
        selectedLocation = playerLocation = "Ocean";
        locationFill.PopulateLocationList();
    }

    public void ConfirmTravel()
    {
        if (!isOk) return;

        playerLocation = selectedLocation;
        locationFill.PopulateLocationList();
    }
}
