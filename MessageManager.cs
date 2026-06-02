using TMPro;
using System.Collections.Generic;
using Unity.VisualScripting;
using UnityEngine;
using System.Globalization;
using System.Linq;
using System;

public class MessageManager : MonoBehaviour
{
    GameManager gameManager;
    GameObject panel;
    GameObject messagePanel;
    GameObject messageTextObj;
    GameObject yesNoButton;
    GameObject confirmButton;
    TextMeshProUGUI messageText;

    GameObject detailsPanel;
    GameObject detailsNameObj;
    GameObject detailsDescriptionObj;
    GameObject detailsDetailsObj;
    TextMeshProUGUI detailsName;
    TextMeshProUGUI detailsDescription;
    TextMeshProUGUI detailsDetails;
    bool detailsisOpen;

    public string entry;


    bool confirmisOpen;
    public void Start()
    {
        gameManager = gameObject.GetComponent<GameManager>();
        messagePanel = GameObject.Find("Message Panel");
        messageTextObj = GameObject.Find("Message Text");
        yesNoButton = GameObject.Find("YesNo");
        confirmButton = GameObject.Find("Confirm");

        detailsPanel = GameObject.Find("Item Details Panel");
        detailsNameObj = GameObject.Find("Item Name");
        detailsDescriptionObj = GameObject.Find("Item Description");
        detailsDetailsObj = GameObject.Find("Item Details");

        messageText = messageTextObj.GetComponent<TextMeshProUGUI>();
        detailsName = detailsNameObj.GetComponent<TextMeshProUGUI>();
        detailsDescription = detailsDescriptionObj.GetComponent<TextMeshProUGUI>();
        detailsDetails = detailsDetailsObj.GetComponent<TextMeshProUGUI>();

        detailsPanel.SetActive(false);
        messagePanel.SetActive(false);
        confirmisOpen = false;
        detailsisOpen = false;
    }
    

    public void ConfirmScreenToggle(string message, bool isYesNo)
    {
        panel = messagePanel;

        if (confirmisOpen)
        {
            messagePanel.SetActive(false);
            confirmisOpen = false;
        }
        else
        {
            messagePanel.SetActive(true);
            messageText.text = message;
            confirmisOpen = true;
            if (isYesNo)
            {
                yesNoButton.SetActive(true);
                confirmButton.SetActive(false);
            }
            else
            {
                yesNoButton.SetActive(false);
                confirmButton.SetActive(true);
            }
        }
    }

    public void ConfirmScreenNo()
    {
        panel.SetActive(false);
        detailsisOpen = false;
    }


    public void DetailsPanelToggle(string entrytype)
    {
        panel = detailsPanel;
        entry = entrytype;  

        if (detailsisOpen)
        {
            detailsPanel.SetActive(false);
            detailsisOpen = false;
        }
        else
        {
            
            detailsPanel.SetActive(true);
            detailsisOpen = true;
        }
        RefreshItemDetails();
    }


    public void ScrollRight()
    {
        do
        {
            gameManager.selectedID += 1;

            // Wrap around if the selectedID goes beyond the last item
            if (gameManager.selectedID >= gameManager.selectedListCount)
            {
                gameManager.selectedID = 0;
            }

            var fishList = gameManager.selectedList.Cast<Fish>().ToList();

            // If it's a FishDexEntry, we only stop if the fish has been caught
            if (entry == "FishDexEntry" && fishList[gameManager.selectedID].hasCaught == 0)
            {
                continue; // Skip if not caught
            }

            break; // Stop the loop if the condition is met (either not FishDexEntry or fish is caught)
        }
        while (true);

        print("selected ID = " + gameManager.selectedID);
        RefreshItemDetails();
    }

    public void ScrollLeft()
    {
        do
        {
            gameManager.selectedID -= 1;

            // Wrap around if the selectedID goes below zero
            if (gameManager.selectedID < 0)
            {
                gameManager.selectedID = gameManager.selectedListCount - 1;
            }

            var fishList = gameManager.selectedList.Cast<Fish>().ToList();

            // If it's a FishDexEntry, we only stop if the fish has been caught
            if (entry == "FishDexEntry" && fishList[gameManager.selectedID].hasCaught == 0)
            {
                continue; // Skip if not caught
            }

            break; // Stop the loop if the condition is met (either not FishDexEntry or fish is caught)
        }
        while (true);

        print("selected ID = " + gameManager.selectedID);
        RefreshItemDetails();
    }

    public void RefreshItemDetails()
    {

        if (entry == "FishInvEntry")
        {
            // Safely cast templateList to List<Fish> and sort
            var fishList = gameManager.selectedList.Cast<Fish>().ToList();
            detailsName.text = fishList[gameManager.selectedID].name;
            detailsDescription.text = fishList[gameManager.selectedID].description;
            detailsDetails.text = $"Weight: {fishList[gameManager.selectedID].weight}\n" +
                              $"Date Added: {fishList[gameManager.selectedID].dateAdded}";
        }
        else if (entry == "FishDexEntry")
        {
            // Safely cast templateList to List<Fish> and sort
            var fishList = gameManager.selectedList.Cast<Fish>().ToList();
            var time = String.Join(", ", fishList[gameManager.selectedID].time);
            var seasons = String.Join(", ", fishList[gameManager.selectedID].seasons);
            var locations = String.Join(", ", fishList[gameManager.selectedID].locations);

            detailsName.text = fishList[gameManager.selectedID].name;
            detailsDescription.text = fishList[gameManager.selectedID].description;
            detailsDetails.text = $"Weight: {fishList[gameManager.selectedID].minWeight} - {fishList[gameManager.selectedID].maxWeight}\n" +
                              $"Time: {time}\n"+
                              $"Season(s): {seasons}\n"+ 
                              $"Location(s): {locations}";
        }
    }













}
