// variable stuff
nickname = document.getElementById("nickname")
sprite = document.getElementById("sprite")
dexno = document.getElementById("dexno")
species = document.getElementById("species")
form = document.getElementById("form")
type1 = document.getElementById("type1")
gender = document.getElementById("gender")
ball = document.getElementById("ball")
nature = document.getElementById("nature")
metlocale = document.getElementById("metlocale")
metdate = document.getElementById("metdate")
ability = document.getElementById("ability")
characteristic = document.getElementById("characteristic")
ribbon = document.getElementById("ribbon")
lvl = document.getElementById("lvl")

move1 = document.getElementById("move1")
move1type = document.getElementById("move1type")

move2 = document.getElementById("move1")
move2type = document.getElementById("move1type")

move2 = document.getElementById("move1")
move2type = document.getElementById("move1type")

move2 = document.getElementById("move2")
move2type = document.getElementById("move2type")

Xoffset = document.getElementById("Xoffset")
Yoffset = document.getElementById("Yoffset")

shiny = document.getElementById("shiny")
trainer = document.getElementById("trainer")
game = document.getElementById("game")

bio = document.getElementById("bio")

outputbox = document.getElementById("output")

let outputArray = []
gender = "null"


function clicktest(){

if (shiny.checked === true){
    isshiny = "-shiny"
}else isshiny = ""
//idk how to check radio button values lol so..

if (document.getElementById("type2").value === ''){
    type2 = 'null'
} else
 type2 = document.getElementById("type2").value
//probably could do this better, but this is just a way to have the dropdown box for type2 be blank instead of saying having to say 'null'. looks a bit nicer

outputArray[0] = '\'' + nickname.value + '\''
outputArray[1] = '\'' + type1.value + '\''
outputArray[2] = '\'' + type2 + '\''

if (form.value === ''){ //if form is empty, just use species name as sprite
outputArray[3] = '\'' + species.value.toLowerCase() + isshiny + '\''
} else //if there's a form, append it
outputArray[3] = '\'' + species.value.toLowerCase() + '-' + form.value.toLowerCase() + isshiny + '\''



outputArray[4] = '\'' + dexno.value + '\''
outputArray[5] = '\'' + species.value + '\''
outputArray[6] = '\'' + gender + '\'' 
outputArray[7] = '\'' + ball.value.slice(0, -5).toLowerCase() + '\''
outputArray[8] = '\'' + nature.value + '\''
outputArray[9] = '\'' + metlocale.value + '\''
outputArray[10] = '\'' + metdate.value + '\''
outputArray[11] = '\'' + ability.value + '\''
outputArray[12] = '\'' + characteristic.value + '\''
outputArray[13] = '\'' + ribbon.value.toLowerCase() + '\''
outputArray[14] = '\'' + lvl.value + '\''

outputArray[15] = '\'' + move1.value + '\''
outputArray[16] = '\'' + move1type.value + '\''

outputArray[17] = '\'' + move2.value + '\''
outputArray[18] = '\'' + move2type.value + '\''

outputArray[19] = '\'' + move3.value + '\''
outputArray[20] = '\'' + move3type.value + '\''

outputArray[21] = '\'' + move4.value + '\''
outputArray[22] = '\'' + move4type.value + '\''

outputArray[23] = '\'' + Xoffset.value + 'px\''
outputArray[24] = '\'' + Yoffset.value + 'px\''

outputArray[25] = '\'' + trainer.value + '\''
outputArray[26] = '\'' + game.value.toLowerCase() + '\''

outputArray[27] = '\'' + bio.value.replaceAll("'", '\\' + "'") + '\''
// ADD FIND/REPLACE FOR APOSTROPHES!!!

// console.log(outputArray)

outputbox.innerHTML = 'const ' +  nickname.value + ' = [' + outputArray + ']'

}

function update_gender(X){
    gender = X
}

function update_ball(){
    document.getElementById("preview_ball").src = "assets/pokedex/ball_" + ball.value.slice(0, -5) + ".png"
}

function update_ribbon(){
    if (ribbon.value === 'None'){
        document.getElementById("preview_ribbon").style.visibility = "hidden"
    } else{
    document.getElementById("preview_ribbon").style.visibility = "visible"
    document.getElementById("preview_ribbon").src = "assets/pokedex/ribbon_" + ribbon.value + ".png"
}
}

function update_game(){
    document.getElementById("preview_game").src = "assets/pokedex/icon_" + game.value + ".png"
}


function offsetinfo(){
    if (document.getElementById("offsetinfo").style.display === 'none'){
    document.getElementById("offsetinfo").style.display = "block"
    }else{
        document.getElementById("offsetinfo").style.display = "none"
    }
}