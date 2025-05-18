// API Configuration
const config = {
    apiBaseUrl: window.location.hostname === 'vmedu421.mtacloud.co.il'
        ? 'http://vmedu421.mtacloud.co.il' // Use full URL in production
        : 'http://localhost:3000'
};

Object.freeze(config);
window.appConfig = config; 