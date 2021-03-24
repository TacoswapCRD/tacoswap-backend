function setConstants() {
    if (!process.env.INFURA_URL) throw new Error(errMsg('INFURA_URL'))
    if (!process.env.MASTER_CONTRACT_ADDRESS) throw new Error(errMsg('MASTER_CONTRACT_ADDRESS'))
    if (!process.env.WETH) throw new Error(errMsg('WETH'))

    return {
        // ENV CONSTANTS
        INFURA_URL: process.env.INFURA_URL,
        MASTER_CONTRACT_ADDRESS: process.env.MASTER_CONTRACT_ADDRESS,
        WETH: process.env.WETH,

        PORT: normalizePort(process.env.PORT || '3000'),
        NODE_ENV: normalizeEnv(process.env.NODE_ENV),
        DEBUG: process.env.DEBUG ? process.env.DEBUG : '',
    }
}

module.exports = setConstants()


function normalizeResponseCount(count) {
    return count > 0 ? count : 100
}

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

function normalizeEnv(val) {
    const nodeEnv = ['development', 'production']
    return nodeEnv.includes(val) ? val : 'development'
}


function errMsg(ConstantName) {
    return `Please provide ${ConstantName} in .env`
}
