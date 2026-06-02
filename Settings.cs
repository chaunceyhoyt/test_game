using System;
using System.Xml.Linq;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class Settings : MonoBehaviour
{
    public TextMeshProUGUI clockText;
    public GameTime gameTime;
    public Slider Music;
    public Slider sFX;
    public Toggle spaceTime;
    public GameObject panel;
    public bool settingsOpen = false;

    void Start()
	{
        panel = GameObject.Find("Settings Background");
        gameTime = gameObject.GetComponent<GameTime>();
		GameObject spacetoggle = GameObject.Find("SpaceTime Toggle");
        spaceTime = spacetoggle.GetComponent<Toggle>();
        //panel.SetActive(false);
    }


    public void SpaceTimeToggle()
    {
        if (spaceTime.isOn)
        {
            gameTime.spacetime = true;
        }
        else
        {
            gameTime.spacetime = false;
        }
    }

    public void ToggleSettings()
    {
        if (!settingsOpen)
        {
            panel.SetActive(true);
            settingsOpen = true;
        }
        else
        {
            panel.SetActive(false);
            settingsOpen = false;
        }
    }

}
