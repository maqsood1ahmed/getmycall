//For Teacher
{
    //local user info
    id= "012", //teacher uid
    room= "cryptedxxx",
    name= "MaqsoodT",
    type= "teacher",
    position= "0",
    bitrate= "720",
    mute= false, //optional b/c all studnets will mute and teacher will unmute
    
    //number of participants in room
    sources= [
        //position "0" will always for large video container
        {
            "id":"012",
            "position": "0"
        },
        {
            "id":"123",
            "position": "1"
        },
        {
            "id":"234",
            "position": "2"
        },
        {
            "id":"456",
            "position": "3"
        },
/* 
        .
        .
        .
*/
        {
            "id":"xxxxxx",
            "position": "n"
        }
    ]
}


//For Student
{
    //local user info
    id= "456", //student uid
    room= "cryptedxxx",
    name= "MaqsoodStd3",
    type= "student",
    position= "3",
    bitrate= "180",
    mute= true, //optional b/c all studnets will mute and teacher will unmute
    
    //number of participants in room
    sources= [
        //position "0" will always for large video container
        {
            "id":"012",
            "position": "0"
        },
        {
            "id":"123",
            "position": "1"
        },
        {
            "id":"234",
            "position": "2"
        },
        {
            "id":"456",
            "position": "3"
        },
/* 
        .
        .
        .
*/
        {
            "id":"xxxxxx",
            "position": "n"
        }
    ]
}