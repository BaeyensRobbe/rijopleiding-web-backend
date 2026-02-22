import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

export const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided');
    return res.status(401).send('Access Denied');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).send('Invalid or expired token');
  }
};

export const authenticateJWTWithRole = (requiredRole) => (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided');
    return res.status(401).send('Access Denied');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (decoded.role !== requiredRole) {
      return res.status(403).send('Forbidden: Insufficient permissions');
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).send('Invalid or expired token');
  }
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('nl-BE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
};

export const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('nl-BE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};
