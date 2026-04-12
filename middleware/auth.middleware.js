const jwt = require('jsonwebtoken');

const JWT_SECRET = "super_secret_key" || 'default-secret';

function authenticateToken(req, res, next) {

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      message: 'Token requerido'
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Token inválido'
    });
  }

  try {

    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();

  } catch (error) {

    return res.status(401).json({
      message: 'Token inválido o expirado'
    });

  }
}

module.exports = authenticateToken;
