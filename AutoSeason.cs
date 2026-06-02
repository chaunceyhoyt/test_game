using System;
using System.Collections.Generic;
using UnityEngine;

public class AutoSeasonBasedOnTimeZone
{
    private bool isSouthernHemisphere;
    public GameTime gameTime;
    public string season;

    public void Start()
    {
        GameObject eventSystemObj = GameObject.Find("EventSystem"); // Replace "EventSystem" with the actual name if different
        if (eventSystemObj != null)
        {
            gameTime = eventSystemObj.GetComponent<GameTime>();
        }
    }

    // A dictionary mapping time zones to hemispheres
    private Dictionary<string, bool> timeZoneHemisphereMap = new Dictionary<string, bool>
    {
        // Southern Hemisphere time zones
        { "Australia/Sydney", true },
        { "America/Sao_Paulo", true },
        { "Africa/Johannesburg", true },
        { "Pacific/Auckland", true },

        // Northern Hemisphere time zones
        { "America/New_York", false },
        { "Europe/London", false },
        { "Asia/Tokyo", false },
        { "Africa/Cairo", false }
        // Add more as needed
    };


    public void DetermineHemisphereAndSeason()
    {
        // Get the player's time zone
        TimeZoneInfo timeZone = TimeZoneInfo.Local;
        string timeZoneId = timeZone.Id;

        // Determine if the player is in the Southern Hemisphere
        isSouthernHemisphere = IsSouthernHemisphere(timeZoneId);

        // Determine season based on hemisphere and current date
        var now = DateTime.Now;
        if (isSouthernHemisphere)
        {
            // Southern Hemisphere
            if (now.Month == 12 || now.Month == 1 || now.Month == 2)
                season = "SUMMER";
            else if (now.Month >= 3 && now.Month <= 5)
                season = "FALL";
            else if (now.Month >= 6 && now.Month <= 8)
                season = "WINTER";
            else
                season = "SPRING";
        }
        else
        {
            // Northern Hemisphere
            if (now.Month == 12 || now.Month == 1 || now.Month == 2)
                season = "WINTER";
            else if (now.Month >= 3 && now.Month <= 5)
                season = "SPRING";
            else if (now.Month >= 6 && now.Month <= 8)
                season = "SUMMER";
            else
                season = "FALL";
        }
    }

    bool IsSouthernHemisphere(string timeZoneId)
    {
        // Check if the time zone exists in the dictionary and return the corresponding hemisphere
        if (timeZoneHemisphereMap.ContainsKey(timeZoneId))
        {
            return timeZoneHemisphereMap[timeZoneId];
        }

        // Default to Northern Hemisphere if the time zone is not in the dictionary
        return false;
    }
}
