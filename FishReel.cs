using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class FishReel : MonoBehaviour {

   // [SerializeField] CanvasManager panels;
   // [SerializeField] FishListMaster fishList;
   // [SerializeField] CastScript castScript;
    [SerializeField] Slider reelBar;
    [SerializeField] Slider catchBar;
    public Image handle;
    public Text text;

    int currentLevel;
    int maxLevel;
    int fishID;
    float min;
    float max;



    public float catchBarValue = 0.0f;
    public float reelBarValue = 0.0f;
    public float reelSpeed;
    public float pullSpeed;
    public float catchSpeed;
    float catchPullSpeed;


    public bool canBlast;
    bool canReel;
    public bool isReeling;
    bool initiate;
    bool isPulling;
    bool canRetrigger;
    bool canBlink;

    void Start () {

        catchBarValue = 50;
        catchPullSpeed = 25;
        catchSpeed = 50;
        reelSpeed = 250;
        pullSpeed = 100;
        min = 60.5f;
        max = 80.5f;
	}


    void Update() { 
    
        if (isPulling == true) 
        { 
        catchBarValue -= Time.deltaTime* catchPullSpeed;
        }

        if (Input.GetButtonDown("Fire1"))
        {
            //reelBarValue += Time.deltaTime * reelSpeed;
        }

        if (Input.GetButtonUp("Fire1"))
        {
            //reelBarValue -= Time.deltaTime * pullSpeed;
        }
     
        if (isReeling & canReel)
        {
            reelBarValue += Time.deltaTime * reelSpeed;
        }

        if (!isReeling)
        {
            reelBarValue -= Time.deltaTime * pullSpeed;
        }


        if (reelBarValue <= 0)
        {
            canReel = true;
            reelBarValue = 0;
            canBlast = true;
            canBlink = true;
            HandleWhite();
            text.text = "";
           
        }


        if (reelBarValue >= 100)
        {
            reelBarValue = 100;
        }


        if (catchBarValue <= 0)
        {
            catchBarValue = 0;
            FishGotAway();
        }

        if (catchBarValue >= 100)
        {
            catchBarValue = 100;
            text.text = "YAY YOU CAUGHT A FISH";
            FishCaught();
        }

        reelBar.value = reelBarValue;
        catchBar.value = catchBarValue;

        //if(reelBarValueis is in deadzone){
        //decrease catchBarValue
        //}

        //if(catchBarValue >= 100){
        //YOU CAUGHT A FISH
        //}

        //if(catchBarValue <= 0){
        //FAILED TO CATCH FISH
        //}
        
    }

    void Blast()
    { 
            catchBarValue += 30;
            canBlast = false;
            canRetrigger = true;
    }


    public void InitiatieReel()
    {
        if (initiate == true)
        {
            currentLevel = 1;
            reelSpeed = 1;
            isReeling = true;
            GetFishInfo();
        }
    }


    //REEL 
    public void ReelOnPress()
    {
        isPulling = true;
        if (canReel == true)
        {
            isReeling = true;
        }
        //add to reel bar
    }

    //PULL
    public void ReelOnRelease()
    {
        initiate = false;
        isReeling = false;
        RetriggerCheck();
        //if(reelBarValue >= min && reelBarValue <= max){
        //NextRound();
        //}

        //if(reelBarValue < min || reelBarValue > max){
        //LevelCheck();
        //}
    }
    void RetriggerCheck()
    {
        if (reelBarValue < min)
        {
            //StartCoroutine(HandleBlink());
            HandleRed();
            canRetrigger = false;
            canReel = false;
        }

        if (reelBarValue > max)
        {
            canRetrigger = false;
            canReel = false;
            //StartCoroutine(HandleBlink());
            HandleRed();
        }

        if (reelBarValue >= min && reelBarValue <= max)
        {
            //catchBarValue += Time.deltaTime * catchSpeed;
            Blast();

        }

        if (reelBarValue < min && canRetrigger == true)
        {
            canReel = true;
            canBlast = true;
        }


    }

    void GetFishInfo()
    {
        //fishID = castScript.catchID;

       // if(fishList.Fish[fishID].rarity != "LEGENDARY")
        {
            //maxLevel = Random.Range(1, fishList.Fish[fishID].fishmaxlevel);
            maxLevel = 1;
        }
    }

    void LevelCheck()
    {
        if(currentLevel < maxLevel)
        {
            currentLevel += 1;
        }
    }

    public void Reset()
    {
      isPulling = false;
      reelBarValue = 0;
      catchBarValue = 50;
    }

    IEnumerator HandleBlink()
    {
        if (canBlink == true)
        {
            handle.color = Color.red;
            yield return new WaitForSeconds(0.2f);
            handle.color = Color.white;
            canBlink = false;
        }
    }

    void HandleRed()
    {
        if (canBlink == true)
        {
            handle.color = Color.red;
            canBlink = false;
        }
    }

    void HandleWhite()
    {

            handle.color = Color.white;

    }

    void changeColor(Color color)
    {
            handle.color = color;
    }

    void FishCaught()
    {
      //  castScript.CloneFish();
    }

    void FishGotAway()
    {
      //  panels.ExitReelBattle();
        Reset();

    }

}
