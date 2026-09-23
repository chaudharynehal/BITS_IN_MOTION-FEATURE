import ReactDOM from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './registerServiceWorker';
import './styles/global.css';
import './styles/experience.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

registerServiceWorker();
