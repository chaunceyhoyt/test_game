using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using System;
using UnityEngine.EventSystems;
public class EventManager
{
    public Dictionary<string, Event> Events;

    public EventManager()
    {
        Events = new Dictionary<string, Event>
	{   { "TEST EVENT", new Event { Name = "TEST EVENT", Month = 8, Day = 16, DaysBefore = 7, DaysAfter = 1, Description = "Sample event description." } },
        { "New Year's Day", new Event { Name = "New Year's Day", Month = 1, Day = 1, DaysBefore = 7, DaysAfter = 1, Description = "The first day of the Gregorian calendar year." } },
        { "Groundhog Day", new Event { Name = "Groundhog Day", Month = 2, Day = 2, DaysBefore = 7, DaysAfter = 1, Description = "A tradition predicting the weather based on the behavior of a groundhog." } },
        { "Valentine's Day", new Event { Name = "Valentine's Day", Month = 2, Day = 14, DaysBefore = 7, DaysAfter = 1, Description = "A day to celebrate love and affection between intimate partners." } },
        { "St. Patrick's Day", new Event { Name = "St. Patrick's Day", Month = 3, Day = 17, DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the patron saint of Ireland, St. Patrick." } },
        { "April Fool's Day", new Event { Name = "April Fool's Day", Month = 4, Day = 1, DaysBefore = 7, DaysAfter = 1, Description = "A day dedicated to playing pranks and practical jokes." } },
        { "Earth Day", new Event { Name = "Earth Day", Month = 4, Day = 22, DaysBefore = 7, DaysAfter = 1, Description = "A day dedicated to raising awareness for environmental protection." } },
        { "Cinco de Mayo", new Event { Name = "Cinco de Mayo", Month = 5, Day = 5, DaysBefore = 7, DaysAfter = 1, Description = "Commemorating the Mexican army's victory over France at the Battle of Puebla." } },
        { "Independence Day", new Event { Name = "Independence Day", Month = 7, Day = 4, DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the adoption of the Declaration of Independence in the U.S." } },
        { "Halloween", new Event { Name = "Halloween", Month = 10, Day = 31, DaysBefore = 7, DaysAfter = 1, Description = "A celebration involving costumes, trick-or-treating, and spooky decorations." } },
        { "Veterans Day", new Event { Name = "Veterans Day", Month = 11, Day = 11, DaysBefore = 7, DaysAfter = 1, Description = "Honoring military veterans who have served in the U.S. Armed Forces." } },
        { "Hanukkah", new Event { Name = "Hanukkah", Month = 12, Day = 10, DaysBefore = 7, DaysAfter = 1, Description = "An eight-day Jewish festival celebrating the rededication of the Second Temple in Jerusalem." } }, // Varies by year
		{ "Christmas Eve", new Event { Name = "Christmas Eve", Month = 12, Day = 24, DaysBefore = 7, DaysAfter = 1, Description = "The evening before Christmas, often marked by festive traditions and gatherings." } },
        { "Christmas Day", new Event { Name = "Christmas Day", Month = 12, Day = 25, DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the birth of Jesus Christ." } },
        { "Kwanzaa", new Event { Name = "Kwanzaa", Month = 12, Day = 26, DaysBefore = 7, DaysAfter = 1, Description = "A week-long celebration honoring African heritage in African-American culture." } },
        { "New Year's Eve", new Event { Name = "New Year's Eve", Month = 12, Day = 31, DaysBefore = 7, DaysAfter = 1, Description = "The final day of the Gregorian calendar year, often marked by parties and celebrations." } },
        { "Chinese New Year", new Event { Name = "Chinese New Year", Month = 2, Day = 12, DaysBefore = 7, DaysAfter = 1, Description = "The beginning of the lunar new year, celebrated in many East Asian countries." } }, // Varies by year
		//{ "Mardi Gras", new Event { Name = "Mardi Gras", Month = 2, Day = 16, DaysBefore = 7, DaysAfter = 1, Description = "A festival of parades and celebrations leading up to Lent." } }, // Varies by year
		//{ "International Women's Day", new Event { Name = "International Women's Day", Month = 3, Day = 8, DaysBefore = 7, DaysAfter = 1, Description = "A global day celebrating the achievements of women." } },
        //{ "Good Friday", new Event { Name = "Good Friday", Month = 4, Day = 2, DaysBefore = 7, DaysAfter = 1, Description = "A Christian Event commemorating the crucifixion of Jesus Christ." } }, // Varies by year
		//{ "Palm Sunday", new Event { Name = "Palm Sunday", Month = 4, Day = GetFirstSunday(4), DaysBefore = 7, DaysAfter = 1, Description = "A Christian Event celebrating Jesus' triumphal entry into Jerusalem." } }, // Varies by year
		{ "Victoria Day", new Event { Name = "Victoria Day", Month = 5, Day = GetLastMonday(5), DaysBefore = 7, DaysAfter = 1, Description = "A Canadian Event celebrating Queen Victoria's birthday." } },
        { "Flag Day", new Event { Name = "Flag Day", Month = 6, Day = 14, DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the adoption of the flag of the United States." } },
        { "Canada Day", new Event { Name = "Canada Day", Month = 7, Day = 1, DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the anniversary of Canadian Confederation." } },
        { "Boxing Day", new Event { Name = "Boxing Day", Month = 12, Day = 26, DaysBefore = 7, DaysAfter = 1, Description = "A Event celebrated after Christmas Day, originating in the United Kingdom." } },
        { "Day of the Dead", new Event { Name = "Day of the Dead", Month = 11, Day = 2, DaysBefore = 7, DaysAfter = 1, Description = "A Mexican Event celebrating deceased loved ones." } },
        { "Father's Day", new Event { Name = "Father's Day", Month = 6, Day = GetThirdSunday(6), DaysBefore = 7, DaysAfter = 1, Description = "A day to honor fathers and father figures." } },
        { "Mother's Day", new Event { Name = "Mother's Day", Month = 5, Day = GetSecondSunday(5), DaysBefore = 7, DaysAfter = 1, Description = "A day to honor mothers and motherhood." } },
        //{ "Rosh Hashanah", new Event { Name = "Rosh Hashanah", Month = 9, Day = 6, DaysBefore = 7, DaysAfter = 1, Description = "The Jewish New Year, a time of prayer, self-reflection, and repentance." } }, // Varies by year
		//{ "Yom Kippur", new Event { Name = "Yom Kippur", Month = 9, Day = 16, DaysBefore = 7, DaysAfter = 1, Description = "The holiest day in Judaism, marked by fasting and repentance." } }, // Varies by year
		//{ "Diwali", new Event { Name = "Diwali", Month = 11, Day = 4, DaysBefore = 7, DaysAfter = 1, Description = "A Hindu festival of lights, symbolizing the victory of light over darkness." } }, // Varies by year
		//{ "Easter", new Event { Name = "Easter", Month = 4, Day = GetEasterSunday(),  DaysBefore = 7, DaysAfter = 1, Description = "A Christian Event celebrating the resurrection of Jesus Christ." } }, // Varies by year
		//{ "Labor Day", new Event { Name = "Labor Day", Month = 9, Day = GetFirstMonday(9), DaysBefore = 7, DaysAfter = 1, Description = "Celebrating the contributions of workers and the labor movement." } },
        //{ "Thanksgiving Day", new Event { Name = "Thanksgiving Day", Month = 11, Day = GetFourthThursday(11), DaysBefore = 7, DaysAfter = 1, Description = "A day of giving thanks for the harvest and blessings of the past year." } },
        //{ "Eid al-Fitr", new Event { Name = "Eid al-Fitr", Month = 5, Day = 13, DaysBefore = 7, DaysAfter = 1, Description = "A Muslim Event celebrating the end of Ramadan, the holy month of fasting." } }, // Varies by year
		//{ "Eid al-Adha", new Event { Name = "Eid al-Adha", Month = 7, Day = 20, DaysBefore = 7, DaysAfter = 1, Description = "A Muslim Event commemorating the willingness of Ibrahim to sacrifice his son as an act of obedience to God." } } // Varies by year
	    };
    }

    private int GetSecondSunday(int month) => GetSpecificDayOfMonth(month, DayOfWeek.Sunday, 2);
    private int GetLastMonday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Monday, -1);
    private int GetFirstMonday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Monday, 1);
    private int GetFourthThursday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Thursday, 4);
    private int GetThirdMonday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Monday, 3);
    private int GetSecondMonday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Monday, 2);
	private int GetThirdSaturday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Saturday, 3);
    private int GetThirdSunday(int month) => GetSpecificDayOfWeekInMonth(month, DayOfWeek.Sunday, 3);
    private int GetFirstSunday(int month) => GetSpecificDayOfMonth(month, DayOfWeek.Sunday, 1);


    private int GetEasterSunday()
    {
        int year = DateTime.Now.Year;

        // Anonymous Gregorian algorithm to calculate Easter
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31; // Month: 3=March, 4=April
        int day = ((h + l - 7 * m + 114) % 31) + 1;

        return day;
    }


    private int GetSpecificDayOfMonth(int month, DayOfWeek dayOfWeek, int occurrence)
    {
        DateTime firstDay = new DateTime(DateTime.Now.Year, month, 1);
        int firstDayOfWeek = (int)firstDay.DayOfWeek;
        int day = ((int)dayOfWeek - firstDayOfWeek + 7) % 7 + 1;
        day += (occurrence - 1) * 7;
        return day;
    }

    private int GetSpecificDayOfWeekInMonth(int month, DayOfWeek dayOfWeek, int occurrence)
    {
        DateTime firstDay = new DateTime(DateTime.Now.Year, month, 1);
        int firstDayOfWeek = (int)firstDay.DayOfWeek;
        int day = ((int)dayOfWeek - firstDayOfWeek + 7) % 7 + 1;

        // Handle negative occurrences (e.g., last Monday)
        if (occurrence > 0)
        {
            day += (occurrence - 1) * 7;
        }
        else if (occurrence == -1)  // Last occurrence
        {
            DateTime lastDay = firstDay.AddMonths(1).AddDays(-1);
            int lastDayOfWeek = (int)lastDay.DayOfWeek;
            day = lastDay.Day - ((lastDayOfWeek - (int)dayOfWeek + 7) % 7);
        }

        return day;
    }
}


public class eventchecker
{
    public EventManager Eventmanager;

    public eventchecker()
    {
        Eventmanager = new EventManager();
    }

    public string isEvent(DateTime date)
    {
        foreach (var Event in Eventmanager.Events.Values)
        {
            if (date >= Event.StartDate && date <= Event.EndDate)
            {
                Debug.Log($"Today's Event is {Event.Name} starting {Event.StartDate} and ending {Event.EndDate}");
                return Event.Name;
            }
        }
        return null;
    }
}
