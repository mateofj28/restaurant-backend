// babel.config.cjs
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current', // Muy importante: adapta la traducción a tu versión de Node.js
        },
      },
    ],
  ],
};