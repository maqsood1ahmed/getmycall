import React from 'react';
import ReactDOM from 'react-dom';
import Confernece from './Conference';
import 'antd/dist/antd.css';

// comment this lines when you dont want to auto run ReactDOM.render
const el = document.getElementById('conference-container');
const type = el.getAttribute('type');
const id = el.getAttribute('user_id');
const class_id = el.getAttribute('class_id');
const api = el.getAttribute('api') ? el.getAttribute('api') : 'login';
let params;

if ( type === 'student' ) {
    const teacher_id = el.getAttribute('teacher_id');
    params = { api, type, id, class_id, teacher_id }
} else {
    params = { api, type, id, class_id }
}
 
ReactDOM.render(<Confernece params={params} />, el);

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