using System;
using System.Collections.Generic;

public class Event
{
    public string Name;
    public int Month;

    public string Description;

    public int Day;
    public int DaysBefore;
    public int DaysAfter;

    public DateTime StartDate => new DateTime(DateTime.Now.Year, Month, Day).AddDays(-DaysBefore);
    public DateTime EndDate => new DateTime(DateTime.Now.Year, Month, Day).AddDays(DaysAfter);
}
