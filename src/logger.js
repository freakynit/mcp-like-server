import winston from 'winston';

let logger = null;

function init(level) {
    logger = winston.createLogger({
        level: level,
        format: winston.format.simple(),
        transports: [
            new winston.transports.Console(),
        ],
    });
}

export {
    init,
    logger
};
