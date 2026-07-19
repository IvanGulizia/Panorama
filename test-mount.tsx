import { render } from 'react-dom/client';
import React, { useState, useEffect } from 'react';
import { Canvas } from './src/components/Canvas';

const App = () => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setTimeout(() => setShow(false), 500);
  }, []);
  return show ? <Canvas /> : <div>Destroyed</div>;
};

// not possible to run this easily in node, just skip
