const logger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;

    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

    if (req.body && !req.is('multipart/form-data')) {
        console.log('Request Body:', JSON.stringify(req.body, null, 2));
    }

    const originalSend = res.send;
    res.send = function (body) {
        console.log(`[${timestamp}] Response:`, typeof body === 'string' ? body : JSON.stringify(body));
        return originalSend.apply(res, arguments);
    };

    next();
};

module.exports = logger; 