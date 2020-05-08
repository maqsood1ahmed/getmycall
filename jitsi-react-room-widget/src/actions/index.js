// import axios from "axios";

// let baseURL = "https://mysterious-sands-35555.herokuapp.com";

// export function fetchMessages(friendId){
//     return (dispatch) => {
//         let url = baseURL + "/messages/" + friendId;
//         return axios.get(url)
//                         .then(res => {
//                             let messages = res.data;
//                             dispatch(storeMessages(messages))
//                         })
//                         .catch(err => console.log(err))

//     }
// }

// export function addMessage(message){
//     return(dispatch) => {
//         dispatch({
//             type: "ADD_MESSAGE",
//             message: message
//         })
//     }
// }

export function addMessages(messages){
    return {
        type : "ADD_MESSAGES",
        messages: messages
    }
}