using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using UnityEngine.UI;
using Unity.VisualScripting;


public class TackleBox : MonoBehaviour {


        // Assign these in the Unity Inspector
        public GameObject[] panels; // Array to hold references to your panels
        public GameObject[] buttons; // Array to hold references to your buttons



    public void Start()
    {
        for (int i = 0; i < panels.Length; i++)
        {
            panels[i].SetActive(i == 0);
        }
    }

    // Call this method when a button is clicked
    public void ShowPanel(int panelIndex)
        {
            // Loop through all the panels
            for (int i = 0; i < panels.Length; i++)
            {
                // Activate the selected panel and deactivate the others
                panels[i].SetActive(i == panelIndex);
            }
        }

    public void ShowAllPanels()
    {
        // Loop through all the panels and activate each one
        for (int i = 0; i < panels.Length; i++)
        {
            panels[i].SetActive(true);
        }
    }

}
