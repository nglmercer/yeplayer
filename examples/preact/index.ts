import { render, h } from 'preact';
import { App } from './App';

const container = document.getElementById('app');
if (container) {
    render(h(App, {}), container);
}
