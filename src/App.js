import React from 'react';
import 'antd/dist/antd.css';

import Conference from './containers/Conference/Conference';
import propTypes from 'prop-types';
import './App.scss';

class App extends React.Component {
    render () {
        return <Conference />;
    }
}

App.propTypes = {
    children: propTypes.element
};

export default App;
