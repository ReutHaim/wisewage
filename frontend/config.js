const config = {
    apiBaseUrl: window.location.hostname === 'vmedu421.mtacloud.co.il'
        ? '' // Use root path in production
        : 'http://localhost:3000'
};

Object.freeze(config);

window.appConfig = config; 