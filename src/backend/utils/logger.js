/**
 * 📝 STRUCTURED LOGGER (SRE Utility)
 * Garante que todos os logs do servidor Bacch sejam rastreáveis e em JSON.
 */

const format = (level, message, meta = {}) => {
    return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...meta,
        env: process.env.NODE_ENV || 'development'
    });
};

export const Logger = {
    info(msg, meta) {
        console.log(format('INFO', msg, meta));
    },
    warn(msg, meta) {
        console.warn(format('WARN', msg, meta));
    },
    error(msg, error, meta) {
        console.error(format('ERROR', msg, { 
            error: error?.message || error, 
            stack: error?.stack,
            ...meta 
        }));
    },
    // Middleware para log de requisições HTTP
    httpMiddleware(req, res, next) {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            Logger.info(`${req.method} ${req.originalUrl} (${res.statusCode}) - ${duration}ms`, {
                ip: req.ip,
                method: req.method,
                url: req.originalUrl,
                status: res.statusCode,
                duration
            });
        });
        next();
    }
};
