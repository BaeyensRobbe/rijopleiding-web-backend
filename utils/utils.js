const jwt = require('jsonwebtoken'); // Make sure to require the 'jsonwebtoken' package
const JWT_SECRET = process.env.JWT_SECRET || 'secretkey'; // Replace with your actual JWT secret

const authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided');
    return res.status(401).send('Access Denied');
  }

  try {
    console.log('Token:', token);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Voeg de gedecodeerde gebruiker toe aan het verzoek
    next(); // Ga verder naar de volgende middleware of route
  } catch (error) {
    console.error(error);
    res.status(401).send('Invalid or expired token');
  }
};

const authenticateJWTWithRole = (requiredRole) => (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided');
    return res.status(401).send('Access Denied');
  }

  try {
    console.log('Token:', token);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Check if the user's role matches the required role
    if (decoded.role !== requiredRole) {
      return res.status(403).send('Forbidden: Insufficient permissions');
    }

    next(); // Proceed to the next middleware or route
  } catch (error) {
    console.error(error);
    res.status(401).send('Invalid or expired token');
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('nl-BE', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('nl-BE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
}

module.exports = {
  authenticateJWT,
  authenticateJWTWithRole,
  formatDate,
  formatTime
};