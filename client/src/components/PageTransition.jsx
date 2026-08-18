import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children, className = '' }) => {
  const location = useLocation();
  const [key, setKey] = useState(location.pathname);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (key !== location.pathname) {
      setIsExiting(true);
      setTimeout(() => {
        setKey(location.pathname);
        setIsExiting(false);
      }, 200);
    }
  }, [location.pathname, key]);

  return (
    <div className={`${className} ${isExiting ? 'animate-out' : 'animate-in'} page-transition`} style={{ position: 'relative', width: '100%' }}>
      {children}
    </div>
  );
};

export default PageTransition;