import React from 'react';
import ReactDOM from 'react-dom';
import Confernece from './Conference';
import 'antd/dist/antd.css';

// comment this lines when you dont want to auto run ReactDOM.render
const el = document.getElementById('conference-container');
ReactDOM.render(<Confernece />, el);

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