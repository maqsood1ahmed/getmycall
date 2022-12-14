import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware, compose } from 'redux';
import { Provider } from "react-redux";
import thunk from "redux-thunk";
import 'antd/dist/antd.css';
import MediaQuery from 'react-responsive';
import { I18nextProvider } from "react-i18next";

import i18n from "./i18n";

import Confernece from './containers/Conference';
import messagesReducer from "./reducers";

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancer = composeEnhancers(
    applyMiddleware(thunk),
  );

let store = createStore(messagesReducer, enhancer);

// comment this lines when you dont want to auto run ReactDOM.render
const el = document.getElementById('conference-container');
const type = el.getAttribute('type');
const id = el.getAttribute('user_id');
const class_id = el.getAttribute('class_id');
const lang= el.getAttribute('user_lang');
const api = el.getAttribute('api') ? el.getAttribute('api') : 'login';
let params;

if ( type === 'student' ) {
    const teacher_id = el.getAttribute('teacher_id');
    params = { api, type, id, class_id, teacher_id, lang }
} else {
    params = { api, type, id, class_id, lang }
}
 
ReactDOM.render(<Provider store={store}>
        {/* For Laptop or Desktop */}
        <MediaQuery minDeviceWidth={1280}>
            <I18nextProvider i18n={i18n}>
                <Confernece 
                    params={params} 
                    isMobileOrTablet={false}/>
            </I18nextProvider>
        </MediaQuery>
        {/* For Mobile and Tablet */}
        <MediaQuery maxDeviceWidth={1280}>
            <I18nextProvider i18n={i18n}>
                <Confernece 
                    params={params} 
                    isMobileOrTablet={true}/>
            </I18nextProvider>
        </MediaQuery>
</Provider>, el);

/* uncomment this block to "defer" ReactDOM.render and expose it globaly
window.ReactCounter = {
    mount: () => {
        const el = document.getElementById('counter-app');
        ReactDOM.render(<Counter />, el);
    },
    unmount: () => {
        const el = document.getElementById('counter-app');
        ReactDOM.unmountComponentAtNode(el);
    }
}
*/