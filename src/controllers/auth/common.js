const checkAuthConfigs = ({ auth, tokenSecret }) => {
  if (auth && !tokenSecret) {
    throw new Error(
      'You need to provide a token secret either from the CLI or from your environment variables',
    );
  }
};

module.exports = { checkAuthConfigs };
