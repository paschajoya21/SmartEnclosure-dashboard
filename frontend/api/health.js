module.exports = function handler(_req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    mode: 'serverless',
    timestamp: new Date().toISOString(),
  });
};
