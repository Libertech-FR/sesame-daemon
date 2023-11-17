export default () => ({
    redis:{
        host : process.env.REDIS_HOST || 'localhost',
        port : parseInt(process.env.REDIS_PORT) || 6379,
        user : process.env.REDIS_USER || '',
        password: process.env.REDIS_PASSWORD ||'',
        application: {
            logger: process.env.LOGGER
        }
    },
    backendsPath: process.env.BACKENDS_PATH || __dirname+'/../backends',
    nameQueue: process.env.NAME_QUEUE || 'backend'
});
