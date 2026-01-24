'use client';

import { useEffect, useRef } from 'react';

export function GridAnimator() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Calculate grid dimensions based on viewport and grid size (18px squares)
    const getGridDimensions = () => {
      const cols = Math.ceil(window.innerWidth / 18);
      const rows = Math.ceil(window.innerHeight / 18);
      return { cols, rows, total: cols * rows };
    };

    // Get random grid position
    const getRandomPosition = (total: number) => {
      return Math.floor(Math.random() * total);
    };

    // Convert grid index to x, y coordinates
    const indexToCoords = (index: number, cols: number) => {
      const x = (index % cols) * 18;
      const y = Math.floor(index / cols) * 18;
      return { x, y };
    };

    // Create and animate a square highlight
    const highlightSquare = (index: number, cols: number) => {
      const { x, y } = indexToCoords(index, cols);
      
      const square = document.createElement('div');
      square.style.position = 'absolute';
      square.style.left = `${x}px`;
      square.style.top = `${y}px`;
      square.style.width = '18px';
      square.style.height = '18px';
      square.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
      square.style.pointerEvents = 'none';
      square.style.transition = 'opacity 0.3s ease-out';
      square.style.opacity = '1';
      square.style.zIndex = '0';
      
      container.appendChild(square);
      
      // Fade out and remove
      setTimeout(() => {
        square.style.opacity = '0';
        setTimeout(() => {
          container.removeChild(square);
        }, 300);
      }, 200);
    };

    // Handle run button event (10 squares staggered by 100ms)
    const handleRunAnimation = () => {
      // Clear any existing animations
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      animationTimeoutsRef.current = [];

      const { cols, total } = getGridDimensions();
      const usedIndices = new Set<number>();

      for (let i = 0; i < 10; i++) {
        const timeout = setTimeout(() => {
          // Get unique random position
          let randomIndex;
          do {
            randomIndex = getRandomPosition(total);
          } while (usedIndices.has(randomIndex) && usedIndices.size < total);
          
          usedIndices.add(randomIndex);
          highlightSquare(randomIndex, cols);
        }, i * 100);
        
        animationTimeoutsRef.current.push(timeout);
      }
    };

    // Handle conversion progress event (highlight based on recordsProcessed)
    const handleConversionProgress = (e: Event) => {
      const customEvent = e as CustomEvent<{ recordsProcessed: number }>;
      const recordsProcessed = customEvent.detail?.recordsProcessed ?? 0;
      
      if (recordsProcessed <= 0) return;

      const { cols, total } = getGridDimensions();
      
      // Highlight 1 square per record processed, but throttle to avoid overwhelming
      // We'll use modulo to only trigger on certain intervals
      const shouldTrigger = recordsProcessed % 100 === 0 || recordsProcessed <= 10;
      
      if (shouldTrigger) {
        const randomIndex = getRandomPosition(total);
        highlightSquare(randomIndex, cols);
      }
    };

    // Listen for custom events
    window.addEventListener('convert-buddy-run', handleRunAnimation);
    window.addEventListener('grid-animate-progress', handleConversionProgress);

    return () => {
      window.removeEventListener('convert-buddy-run', handleRunAnimation);
      window.removeEventListener('grid-animate-progress', handleConversionProgress);
      
      // Clear all timeouts
      animationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  );
}
