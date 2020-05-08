let initialState = {
    messages: []
}

const messagesReducer = (state = initialState, action)=>{
    if(action.type==="ADD_MESSAGES"){
        return{
            ...state,
            messages: state.messages.concat(action.messages)
        }
    } 
    else{
        return{
            ...state
        }
    }
}

export default messagesReducer;