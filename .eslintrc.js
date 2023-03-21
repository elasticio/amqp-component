module.exports = {
  extends: 'airbnb-base',
  env: {
    mocha: true,
    node: true,
  },
  rules: {
    'no-await-in-loop': 0,
    'max-len': ['error', { code: 180 }],
    'no-restricted-syntax': 0,
  },
};
