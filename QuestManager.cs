using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using static UnityEngine.InputSystem.LowLevel.InputStateHistory;
using static UnityEngine.UIElements.UxmlAttributeDescription;

public class QuestManager : MonoBehaviour
{
    StoryManager storyManager;

    void Start()
    {
        //Initialize Scripts
        storyManager = gameObject.GetComponent<StoryManager>();
    }


    public void WhaleSong()
    {

        //-Whale song quest -Player must use sonar to track whales to catch rare fish. 

        //Reward - Unlock new boat
    }

    public void FixLighthouse()
    {
        //Fix the Lighthouse - Use Bioluminecent fish to light the light house. 

        storyManager.UnlockTrench();
    }

    public void CleanUpRiver()
    {
        storyManager.UnlockPond();
    }
     











}
