function authorizeRoles(...allowedRoles) {

    return (req, res, next) => {
  
      const user = req.user;
  
      if (!user || !user.roles) {
        return res.status(403).json({
          message: 'No autorizado'
        });
      }
  
      const hasRole = allowedRoles.some(role =>
        user.roles.includes(role)
      );
  
      if (!hasRole) {
        return res.status(403).json({
          message: 'Permisos insuficientes'
        });
      }
  
      next();
    };
  }
  
  module.exports = authorizeRoles;
  