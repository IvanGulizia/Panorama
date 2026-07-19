/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { RightSidebar } from './components/RightSidebar';
import { TopBar } from './components/TopBar';
import { useStore } from './store';

export default function App() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          useStore.getState().redo();
        } else {
          useStore.getState().undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col w-full h-screen bg-[#fdfdfd] text-[#1a1a1a] font-sans overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <main className="flex-1 relative overflow-hidden bg-[#f7f7f7] p-2 sm:p-4">
          <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden shadow-sm bg-white relative">
            <Canvas />
          </div>
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
