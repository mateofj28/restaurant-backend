// jest.config.js
export default {
    testEnvironment: 'node',
    setupFiles: ['dotenv/config'],
    // Reemplaza globalSetup/globalTeardown por setupFilesAfterEnv
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    // Elimina estas líneas, ya no son necesarias
    // globalSetup: '<rootDir>/jest.global-setup.js',
    // globalTeardown: '<rootDir>/jest.global-teardown.js',
};