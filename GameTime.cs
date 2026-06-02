using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using System;
using UnityEngine.EventSystems;
using System.Globalization;

public class GameTime : MonoBehaviour
{
    public TextMeshProUGUI clockText;
    public TextMeshProUGUI debugText;
    public GameManager gameManager;
    public eventchecker myEventChecker = new eventchecker();
    public AutoSeasonBasedOnTimeZone autoseason = new AutoSeasonBasedOnTimeZone();
    public ShopController shopController;
    public SaveLoadManager saveLoadManager;
    public string season;
    public string timeOfDay;
    public string todayWeather;
    public string todayWeatherDesc;
    public string tomorrowWeather;
    public string tomorrowWeatherDesc;
    public string Event;
    public bool isEventDay;
    public string EventDesc;
    public bool spacetime;
    public bool isFestivalDay; // This can be set during special events
    public bool isNewWeek;
    public bool isNewMonth;
    private int currentWeek;
    private int lastCheckedWeek;
    private int previousMonth;
    public int daysSinceLastBoot;
    private DateTime lastBoot;
    private DateTime today;
    private DateTime yesterday;

    void Start()
    {
        // Load previously saved data
        if (PlayerPrefs.HasKey("lastBoot"))
        {
            lastBoot = DateTime.Parse(PlayerPrefs.GetString("lastBoot"));
        }
        else
        {
            lastBoot = DateTime.Now;
        }

        // Calculate days since last boot
        int daysSinceLastBoot = (DateTime.Now.Date - lastBoot.Date).Days;

        // Load today's weather if same day
        if (PlayerPrefs.HasKey("todayWeather"))
        {
            todayWeather = PlayerPrefs.GetString("todayWeather");
        }

        // Update weather for the missed days if needed
        if (daysSinceLastBoot > 0)
        {
            for (int i = 0; i < daysSinceLastBoot; i++)
            {
                todayWeather = PlayerPrefs.GetString("tomorrowWeather");  // Yesterday's "tomorrowWeather" is now "todayWeather"
                DetermineTomorrowWeather();  // Determine the next day's weather
            }
            // Save last boot time to PlayerPrefs
            PlayerPrefs.SetString("lastBoot", DateTime.Now.ToString());
        }
        else
        {
            // Load tomorrow's weather if it exists
            if (PlayerPrefs.HasKey("tomorrowWeather"))
            {
                tomorrowWeather = PlayerPrefs.GetString("tomorrowWeather");
            }
        }

        // If no weather was set yet, determine today's and tomorrow's weather
        if (string.IsNullOrEmpty(todayWeather))
        {
            SetWeather();  // Set initial weather for today
            DetermineTomorrowWeather();  // Set weather for tomorrow
        }



        // Save the initial weather data
        SaveWeatherData();

        //Set system variables
        GameObject eventsys = GameObject.Find("EventSystem"); // Replace "EventSystem" with the actual name if different
        gameManager = eventsys.GetComponent<GameManager>();
        GameObject clockui = GameObject.Find("Clock Text"); // Replace "EventSystem" with the actual name if different
        GameObject debugTextObj = GameObject.Find("debugText");
        debugText = debugTextObj.GetComponent<TextMeshProUGUI>();
        clockText = clockui.GetComponent<TextMeshProUGUI>();
        shopController = eventsys.GetComponent<ShopController>();
        saveLoadManager = gameObject.GetComponent<SaveLoadManager>();
        lastBoot = DateTime.Now;
        currentWeek = CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(today, CalendarWeekRule.FirstDay, DayOfWeek.Sunday);
        TimeCheck();
        season = autoseason.season;
        CheckEvent();

        debugText.text = $"It is a {todayWeather}\n{season} {timeOfDay}.\nTomorrow it will be {tomorrowWeather}.";
        Debug.Log($"It is a {todayWeather} {season} {timeOfDay}.Tomorrow it will be {tomorrowWeather}.");
    }

    void Update()
    {
        UpdateDateTimes();
        UpdateClockText();
    }

    public void TimeCheck()
    {
        UpdateDateTimes();
        UpdateTimeOfDay();
        NewDayCheck();
        WeekMonthCheck();
        UpdateSeason();
    }

    public void ToggleSpaceTime()
    {
        spacetime = !spacetime;
    }

    void UpdateClockText()
    {
        clockText.text = DateTime.Now.ToString(spacetime ? "ddd. MMM. dd\nH:mm" : "ddd. MMM. dd\nh:mm tt");
    }

    void UpdateDateTimes()
    {
        today = DateTime.Now;
        yesterday = today.AddDays(-1);
    }
    void UpdateSeason()
    {
        autoseason.DetermineHemisphereAndSeason();
    }

  

    void NewDayCheck()
    {
        int daysSinceLastBoot = (today.Date - lastBoot.Date).Days;

        // If more than a day has passed since last boot, update the weather accordingly
        if (daysSinceLastBoot > 0)
        {
            for (int i = 0; i < daysSinceLastBoot; i++)
            {
                DetermineTomorrowWeather();  // Determine the next day's weather
            }
            lastBoot = today;
            SetWeather();
            shopController.RestockShops();
            PlayerPrefs.SetString("lastBoot", lastBoot.ToString());
        }

        // If tomorrow's weather hasn't been calculated yet, do so
        if (string.IsNullOrEmpty(tomorrowWeather))
        {
            DetermineTomorrowWeather();
        } 
    }

    void SetWeather()
    {
        // If todayWeather hasn't been set or there's an event day, default to "SUNNY"
        if (string.IsNullOrEmpty(todayWeather) || isEventDay)
        {
            todayWeather = "SUNNY";
        }
        else
        {
            todayWeather = tomorrowWeather;
        }
    }

    void WeekMonthCheck()
    {
        if (currentWeek != lastCheckedWeek)
        {
            isNewWeek = true;
            lastCheckedWeek = currentWeek;
            shopController.isFishAssortmentPopulated = false; // Only reset fish assortment if it's a new week
        }

        if (today.Month != previousMonth)
        {
            isNewMonth = true;
            previousMonth = today.Month;
        }
    }

    void UpdateTimeOfDay()
    {
        switch (DateTime.Now.Hour)
        {
            case >= 4 and <= 9:
                timeOfDay = "MORNING";
                break;
            case >= 10 and <= 17:
                timeOfDay = "DAY";
                break;
            default:
                timeOfDay = "NIGHT";
                break;
        }
    }

    void CheckHolidays()
    {
        eventchecker holidayChecker = new eventchecker();
        isFestivalDay = holidayChecker.isEvent(today) != null;
    }

    public void CheckEvent()
    {
        Event = myEventChecker.isEvent(today);
    }


    private Dictionary<string, List<string>> seasonWeatherOptions = new Dictionary<string, List<string>>()
{
    { "SPRING", new List<string> { "SUNNY", "SUNNY", "RAINY", "CLOUDY", "STORMY" } },
    { "SUMMER", new List<string> { "SUNNY", "SUNNY", "SUNNY", "RAINY", "CLOUDY", "STORMY", "WINDY" } },
    { "FALL", new List<string> { "SUNNY", "SUNNY", "RAINY", "RAINY", "CLOUDY", "WINDY" } },
    { "WINTER", new List<string> { "CLOUDY", "SUNNY", "SNOWY" } }
};


    void DetermineTomorrowWeather()
    {
        if (seasonWeatherOptions.ContainsKey(season))
        {
            tomorrowWeather = GetRandomWeather(seasonWeatherOptions[season]);
        }
    }

    string GetRandomWeather(List<string> possibleWeathers)
    {
        int randomIndex = UnityEngine.Random.Range(0, possibleWeathers.Count);
        return possibleWeathers[randomIndex];
    }

    public string GetTomorrowForecast()
    {
        return "Tomorrow's forecast: " + tomorrowWeather;
    }

    void SaveWeatherData()
    {
        PlayerPrefs.SetString("todayWeather", todayWeather);
        PlayerPrefs.SetString("tomorrowWeather", tomorrowWeather);
        PlayerPrefs.Save();
    }


}
