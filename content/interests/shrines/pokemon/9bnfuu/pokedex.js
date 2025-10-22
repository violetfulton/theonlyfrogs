let box_selected = 0
const pokemongif = document.getElementById("pokemon3D");



// startup
initballs(boxes[0])
initbox(boxes[0])


function initballs(box){
    clearballs()

for(let counter = 0; counter < box.length; counter++){ //run as many times as there are items in the box

    

    let pokeballnew = document.createElement("img") //create new pokeball img

    pokeballnew.setAttribute("draggable", "false")


    // console.log("ball_" + String(box[counter][0]))
    
    pokeballnew.id = "ball_" + String(box[counter][0])

    pokeballnew.setAttribute("onclick","refresh('" + String(box[counter][0]) + "');" + "ballselectspin('"+ pokeballnew.id +"');");

    pokeballnew.src = 'assets/pokedex/ball_' + box[counter][7] + '.png' //setting the image correctly
    pokeballnew.classList.add('pokeball') //giving it the universal pokeball css

    document.getElementById("pokeballs_list").appendChild(pokeballnew) //actually creating it
}

}

const cursor = document.getElementById('ballcursornew')
const cursoroffsetY = 1
const cursoroffsetX = -3

function ballselectspin(target){

    cursor.style.display = "block";

    document.getElementById('ballcursornew').style.top = document.getElementById(target).offsetTop - cursoroffsetY + 'px'
    
}


function initbox(box){
    clearbox()
    document.getElementById("boxname").innerHTML = boxnames[box_selected];
    document.getElementById("boxscreen").style.backgroundImage = "url(assets/pokedex/box_" + boxbgs[box_selected] + ".png)";

    for(let counter = 0; counter < box.length; counter++){

    let boxpokecontainernew = document.createElement("div") //create box div

    boxpokecontainernew.id = 'boxdiv' + counter //give it an ID

    boxpokecontainernew.classList.add('boxentry') //give it the universal box div style

    boxpokecontainernew.setAttribute("onclick","refresh('" + String(box[counter][0]) + "'); swapview();" + "ballselectspin('"+ "ball_" + String(box[counter][0]) +"');"); //give it the onclick function

    document.getElementById("boxcontainer").appendChild(boxpokecontainernew) //render it


    let boxpokenew = document.createElement("img") //create the pokemon icon

    boxpokenew.classList.add('boxicon')

    boxpokenew.src = "assets/box sprites/" + box[counter][3] + ".png" //give it the correct img
    

    document.getElementById("boxdiv" + counter).appendChild(boxpokenew) //render it inside the correct box

    }

}

let move1type
let move2type
let move3type
let move4type


function refresh(pokemon){


    document.getElementById("pokemon3D").innerHTML = "<img src=\"assets/pokemon 3d/" + eval(pokemon)[3] + ".gif\">";
    // Image Offset
    pokemongif.style.right = eval(pokemon)[23];
    pokemongif.style.top = eval(pokemon)[24];

    document.getElementById("species").innerHTML =  eval(pokemon)[5]
    
    document.getElementById("nature").innerHTML =  eval(pokemon)[8]
    document.getElementById("locale").innerHTML =  eval(pokemon)[9]
    document.getElementById("date").innerHTML =  eval(pokemon)[10]
    document.getElementById("ability").innerHTML =  eval(pokemon)[11]
    document.getElementById("characteristic").innerHTML =  eval(pokemon)[12]
    document.getElementById("lvl").innerHTML =  eval(pokemon)[14]

    document.getElementById("IDno").innerHTML =  eval(pokemon)[4]

    document.getElementById("OT").innerHTML =  eval(pokemon)[25]
    document.getElementById("gameicon").src =  'assets/pokedex/icon_' + eval(pokemon)[26] + '.png'


    // Gender
    if (eval(pokemon)[6] === "null"){
        document.getElementById("nickname").innerHTML = eval(pokemon)[0];
       } else{
        document.getElementById("nickname").innerHTML = eval(pokemon)[0] + "<img src=\"assets/pokedex/" + eval(pokemon)[6] + ".png\">";
       }


    // Move Names
    document.getElementById("Move1_Name").innerHTML = eval(pokemon)[15];
    document.getElementById("Move2_Name").innerHTML = eval(pokemon)[17];
    document.getElementById("Move3_Name").innerHTML = eval(pokemon)[19];
    document.getElementById("Move4_Name").innerHTML = eval(pokemon)[21];

    // Move Types
    move1type = eval(pokemon)[16]
    move2type = eval(pokemon)[18]
    move3type = eval(pokemon)[20]
    move4type = eval(pokemon)[22]



    // Ribbon
    var x = document.getElementById("ribbon");
    if (eval(pokemon)[13] === "none") {
      x.style.display = "None";
    } else {
      x.style.display = "Block";
      x.src = "assets/pokedex/ribbon_" + eval(pokemon)[13] + ".png";
    }

    // Shiny Star
    var shinystar = document.getElementById("shiny");
    if (eval(pokemon)[3].substring(eval(pokemon)[3].lastIndexOf("-") + 1) === 'shiny') {
      shinystar.style.display = "Block";
    } else {
      shinystar.style.display = "None";
    } //this cuts out just the final part of the sprite, and if it has the -shiny tag, it displays a shiny star. thought this was more efficient than wasting an array slot on it..


    // Description stuff

    document.getElementById("poke_description").innerHTML = eval(pokemon)[27] //setting the text content

    //when to display the i icon
    if (eval(pokemon)[27] !== '' ){
      document.getElementById("i_button").style.display = "block"
    } else{
      document.getElementById("i_button").style.display = "none"
      
    }
    //closing the menu when changing screens
    if (ribbonopen === "true"){
      sidewindow.style.left = "-164px"
      ribbonopen = "false"
    }



    // Monotype Support
         document.getElementById("type1").src = "assets/types/" + eval(pokemon)[1] + "IC_SM.png"
         if (eval(pokemon)[2] === "null"){
          document.getElementById("type2").style.display = "None";
         } else{
          document.getElementById("type2").style.display = "Block";
          document.getElementById("type2").src = "assets/types/" + eval(pokemon)[2] + "IC_SM.png"
         }
  

        moveRefresh();
}




// MOVE TYPE DISPLAY

function moveRefresh(){
    document.getElementById("Move1_Border").style.background = "linear-gradient(to bottom, var(--" + move1type + "_border1), var(--" + move1type + "_border2))";
    document.getElementById("Move1_Line").style.background = "var(--" + move1type + "_stripe)";
    document.getElementById("Move1_Inner").style.background = "var(--" + move1type + "_main)";
    document.getElementById("Move1_Accent").style.background = "linear-gradient(to bottom, var(--" + move1type + "_accent1), var(--" + move1type + "_accent2))";
    
    document.getElementById("Move1_Type").innerHTML = "<img src=\"assets/types/" + move1type + "IC_SM.png\">"
    
    document.getElementById("Move2_Border").style.background = "linear-gradient(to bottom, var(--" + move2type + "_border1), var(--" + move2type + "_border2))";
    document.getElementById("Move2_Line").style.background = "var(--" + move2type + "_stripe)";
    document.getElementById("Move2_Inner").style.background = "var(--" + move2type + "_main)";
    document.getElementById("Move2_Accent").style.background = "linear-gradient(to bottom, var(--" + move2type + "_accent1), var(--" + move2type + "_accent2))";
    
    document.getElementById("Move2_Type").innerHTML = "<img src=\"assets/types/" + move2type + "IC_SM.png\">"
    
    document.getElementById("Move3_Border").style.background = "linear-gradient(to bottom, var(--" + move3type + "_border1), var(--" + move3type + "_border2))";
    document.getElementById("Move3_Line").style.background = "var(--" + move3type + "_stripe)";
    document.getElementById("Move3_Inner").style.background = "var(--" + move3type + "_main)";
    document.getElementById("Move3_Accent").style.background = "linear-gradient(to bottom, var(--" + move3type + "_accent1), var(--" + move3type + "_accent2))";
    
    document.getElementById("Move3_Type").innerHTML = "<img src=\"assets/types/" + move3type + "IC_SM.png\">"
    
    
    document.getElementById("Move4_Border").style.background = "linear-gradient(to bottom, var(--" + move4type + "_border1), var(--" + move4type + "_border2))";
    document.getElementById("Move4_Line").style.background = "var(--" + move4type + "_stripe)";
    document.getElementById("Move4_Inner").style.background = "var(--" + move4type + "_main)";
    document.getElementById("Move4_Accent").style.background = "linear-gradient(to bottom, var(--" + move4type + "_accent1), var(--" + move4type + "_accent2))";
    
    document.getElementById("Move4_Type").innerHTML = "<img src=\"assets/types/" + move4type + "IC_SM.png\">"
    }





    // MENU NAVIGATION STUFF

    // switch between PKMN info and Moves tabs
    function menuswitch(){
        Movemenu()
        Infotabs()
      }
      

      
      function Movemenu(){
      var x = document.getElementById("movelist");
        if (x.style.display === "block") {
          x.style.display = "Block";
        } else {
          x.style.display = "Block";
          document.getElementById("infotabs").style.display = "None"
          document.getElementById("movesbutton").src = "assets/pokedex/moveiconA.png"
          document.getElementById("infobutton").src = "assets/pokedex/infoiconB.png"
        }
      }
      
      function Infotabs(){
      var x = document.getElementById("infotabs");
        if (x.style.display === "block") {
          x.style.display = "Block";
        } else {
          x.style.display = "Block";
          document.getElementById("movelist").style.display = "None"
          document.getElementById("movesbutton").src = "assets/pokedex/moveiconB.png"
          document.getElementById("infobutton").src = "assets/pokedex/infoiconA.png"
        }
      }


    // Switch between PC and Box screens
      function swapview(){
        var dex = document.getElementById("pokedex");
        var box = document.getElementById("boxscreen");
        if (dex.style.visibility === "hidden") {
          dex.style.visibility = "visible"
          cursor.style.display = "Block";
          box.style.display = "None";
        } else {
          dex.style.visibility = "hidden";
          cursor.style.display = "None";
          box.style.display = "Block";
          Infotabs();
        }
      }



      

// box navigation
function PCback(){
    if (box_selected === 0){
        console.log("tried to go back <: " + box_selected)
        return
    }else

    box_selected -= 1

    initballs(boxes[box_selected])
    initbox(boxes[box_selected])

}

function PCforw(){

    if (box_selected === boxes.length - 1){
        console.log("tried to go forward >: " + box_selected)
        return
    }else

    box_selected += 1

    initballs(boxes[box_selected])
    initbox(boxes[box_selected])
    

}


// clearing old data when switching pages
function clearballs(){
    document.getElementById('pokeballs_list').innerHTML = ""
    
    let newcursor = document.createElement("img")


    newcursor.src = "assets/pokedex/pokeballoutline.png"

    newcursor.classList.add('spin')

    newcursor.id = "ballcursornew"

    document.getElementById('pokeballs_list').appendChild(newcursor)

}

function clearbox(){
    document.getElementById('boxcontainer').innerHTML = ""
}


const sidewindow = document.getElementById("ribbonmenu")
let ribbonopen = "false"
let leftpos

function ribbonmenu_open(){
  if (ribbonopen === "false"){
  sidewindow.style.animation = 'ribbonmenupopout 0.25s ease-in-out 0s 1 normal forwards'
  ribbonopen = "true"
  leftpos = "0px"
} else{
  sidewindow.style.animation = 'ribbonmenupopout 0.25s ease-in-out 0s 1 reverse forwards'
  ribbonopen = "false"
  leftpos = "-164px"
}
  
}

sidewindow.addEventListener('webkitAnimationEnd', function(){
  this.style.animation = '';
  // isopening = false
  sidewindow.style.left = leftpos
})

function ribbonmenu_close(){
  sidewindow.style.animation = 'ribbonmenupopout 0.25s ease-in-out 0s 1 reverse forwards'
}





//PRELOADING ALL POKEMON SPRITES

var preloadgif = []

var preloadbox = []

var preloadboxbg = []

var preloadballs = []

var preloadgame = []

preloadgifs()

preloadboxes()

preloadboxbgs()

preloadpokeballs()

preloadgames()

function preloadgifs(){


  let arraycounter = 0
  let boxID = 0
  let pokeID = 0

  for (boxID = 0; boxID <= boxes.length - 1;){
    pokeID = 0
  

    for (pokeID = 0; pokeID <= boxes[boxID].length - 1;){
    preloadgif[arraycounter] = new Image();
    preloadgif[arraycounter].src = "assets/pokemon 3d/" + boxes[boxID][pokeID][3] +".gif"
    console.log(pokeID)
    pokeID++
    arraycounter += 1
    }
    boxID += 1


  }

}

function preloadboxes(){


  let arraycounter = 0
  let boxID = 0
  let pokeID = 0

  for (boxID = 0; boxID <= boxes.length - 1;){
    pokeID = 0
    


    for (pokeID = 0; pokeID <= boxes[boxID].length - 1;){
    preloadbox[arraycounter] = new Image();

    preloadbox[arraycounter].src = "assets/box sprites/" + boxes[boxID][pokeID][3] +".png"
    console.log(pokeID)
    pokeID++
    arraycounter += 1

    }
    boxID += 1


  }

}

function preloadpokeballs(){


  let arraycounter = 0
  let boxID = 0
  let pokeID = 0

  for (boxID = 0; boxID <= boxes.length - 1;){
    pokeID = 0
    


    for (pokeID = 0; pokeID <= boxes[boxID].length - 1;){
    preloadballs[arraycounter] = new Image();

    preloadballs[arraycounter].src = "assets/pokedex/ball_" + boxes[boxID][pokeID][7] +".png"
    console.log(pokeID)
    pokeID++
    arraycounter += 1

    }
    boxID += 1


  }

}

function preloadgames(){


  let arraycounter = 0
  let boxID = 0
  let pokeID = 0

  for (boxID = 0; boxID <= boxes.length - 1;){
    pokeID = 0
    


    for (pokeID = 0; pokeID <= boxes[boxID].length - 1;){
    preloadgame[arraycounter] = new Image();

    preloadgame[arraycounter].src = "assets/pokedex/icon_" + boxes[boxID][pokeID][26] +".png"
    console.log(pokeID)
    pokeID++
    arraycounter += 1

    }
    boxID += 1


  }

}

//preloading box background images

function preloadboxbgs(){

    for (let arraycounter = 0; arraycounter <= boxbgs.length - 1; arraycounter++){
    preloadboxbg[arraycounter] = new Image();
    preloadboxbg[arraycounter].src = "assets/pokedex/box_" + boxbgs[arraycounter] +".png"
    }

}

  // 1st num: which box
  // 2nd num: which pokemon in that box
  // 3rd num: universal sprite num


  //Preloading Type images (+ some other stuff)

var typeimages = [];
function preloadtypes() {
    for (var i = 0; i < arguments.length; i++) {
      typeimages[i] = new Image();
      typeimages[i].src = preloadtypes.arguments[i];
    }
}

preloadtypes(
    "assets/types/BugIC_SM.png",
    "assets/types/NormalIC_SM.png",
    "assets/types/GhostIC_SM.png",
    "assets/types/PsychicIC_SM.png",
    "assets/types/DarkIC_SM.png",
    "assets/types/DragonIC_SM.png",
    "assets/types/SteelIC_SM.png",
    "assets/types/FireIC_SM.png",
    "assets/types/WaterIC_SM.png",
    "assets/types/GrassIC_SM.png",
    "assets/types/PoisonIC_SM.png",
    "assets/types/FlyingIC_SM.png",
    "assets/types/GroundIC_SM.png",
    "assets/types/RockIC_SM.png",
    "assets/types/FairyIC_SM.png",
    "assets/types/FightingIC_SM.png",
    "assets/types/ElectricIC_SM.png",
    "assets/types/IceIC_SM.png",

    "assets/pokedex/moveiconA.png",
    "assets/pokedex/infoiconB.png",
)

