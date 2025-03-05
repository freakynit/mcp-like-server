async function init(config) {
    // no-op
}

async function run(handler, args) {
    return await handler(args);
}

export {
    init,
    run
};
