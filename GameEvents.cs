using System;

public static class GameEvents
{
    // Fishing Events
    public static event Action<Fish> OnFishCaught;
    public static event Action<Fish> OnFishBite;
    public static event Action<Fish> OnFishEscaped;
    public static event Action OnInvalidCatch;

    // Player Progression Events
    public static event Action<int> OnXPChanged;
    public static event Action<int> OnLevelUp;
    public static event Action OnInventoryUpdated;

    // Environment Events
    public static event Action<GameTime> OnTimeChanged;
    public static event Action<Season> OnSeasonChanged;
    //public static event Action<Weather> OnWeatherChanged;

    // UI/Navigation Events
    public static event Action<string> OnMapLocationChanged;
    public static event Action<string> OnOpenPanel;
    public static event Action<string> OnClosePanel;

    // Invokers
    public static void TriggerFishCaught(Fish fish) => OnFishCaught?.Invoke(fish);
    public static void TriggerFishBite(Fish fish) => OnFishBite?.Invoke(fish);
    public static void TriggerFishEscaped(Fish fish) => OnFishEscaped?.Invoke(fish);
    public static void TriggerInvalidCatch() => OnInvalidCatch?.Invoke();

    public static void TriggerXPChanged(int newXP) => OnXPChanged?.Invoke(newXP);
    public static void TriggerLevelUp(int newLevel) => OnLevelUp?.Invoke(newLevel);
    public static void TriggerInventoryUpdated() => OnInventoryUpdated?.Invoke();

    public static void TriggerTimeChanged(GameTime time) => OnTimeChanged?.Invoke(time);
    public static void TriggerSeasonChanged(Season season) => OnSeasonChanged?.Invoke(season);
    //public static void TriggerWeatherChanged(Weather weather) => OnWeatherChanged?.Invoke(weather);

    public static void TriggerMapLocationChanged(string location) => OnMapLocationChanged?.Invoke(location);
    public static void TriggerOpenPanel(string panelName) => OnOpenPanel?.Invoke(panelName);
    public static void TriggerClosePanel(string panelName) => OnClosePanel?.Invoke(panelName);
}
