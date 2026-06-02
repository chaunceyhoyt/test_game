using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class Achievement
{
    public int id; // Unique identifier for the achievement
    public string name; // Name of the achievement
    public string description; // Detailed description of the achievement
    public string criteria; // Specific requirements to unlock the achievement
    public string category; // Category of the achievement
    public int points; // Points awarded for the achievement
    public bool isUnlocked; // Whether the achievement has been unlocked
    public string unlockCondition; // Description of the unlock condition
    public string reward; // Reward granted upon unlocking the achievement
    public float progress; // Current progress towards unlocking the achievement
    public float maxProgress; // Maximum progress required
    public bool isHidden; // Whether the achievement is hidden until unlocked
}