const errorHandler = (err, req, res, next) => {
    const timestamp = new Date().toISOString();
    
    console.error(`[${timestamp}] Error:`, {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    const error = {
        message: err.message || 'Internal Server Error',
        status: err.status || 500
    };

    res.status(error.status).json({ error: error.message });
};

module.exports = errorHandler; 