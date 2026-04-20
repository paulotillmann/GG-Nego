const fs = require('fs');
const file = 'src/pages/AnotacoesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(
  "import React, { useState, useEffect } from 'react';", 
  "import React, { useState, useEffect, useRef } from 'react';"
);
content = content.replace(
  "import { Plus, X, Search, Clock, CalendarDays, Edit2, Trash2 } from 'lucide-react';",
  "import { Plus, X, Search, Clock, CalendarDays, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';"
);

// Hooks for scroll wrapper
const hookAnchor = "export default function AnotacoesScreen() {";
const hookInject = `export default function AnotacoesScreen() {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    setTimeout(checkScroll, 100);
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [anotacoes]);

  const scrollByAmount = (offset) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };`;
content = content.replace(hookAnchor, hookInject);

// Container replacement
const oldContainerStart = `{/* Kanban Board Container (Scrollable Horizontally) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
        <div className="flex gap-4 h-full w-max mx-auto items-start">`;

const newContainerStart = `{/* Kanban Board Container (com setas de rolagem) */}
      <div className="relative flex-1 w-full max-w-[1846px] mx-auto overflow-hidden group">
        
        {canScrollLeft && (
          <button 
            onClick={() => scrollByAmount(-300)}
            className="absolute left-[-15px] xl:left-[-25px] top-[40%] -translate-y-1/2 z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div 
          ref={scrollRef} 
          onScroll={checkScroll} 
          className="flex-1 overflow-x-hidden overflow-y-hidden pb-4 w-full h-full scroll-smooth"
        >
          <div className="flex gap-4 h-full w-max mx-auto items-start">`;

content = content.replace(oldContainerStart, newContainerStart);

// At the end of the loop, close the new div and add the right arrow
const oldContainerEnd = `          })}
        </div>
      </div>

      {/* Modal */}`;

const newContainerEnd = `          })}
        </div>
      </div>

      {canScrollRight && (
          <button 
            onClick={() => scrollByAmount(300)}
            className="absolute right-[-15px] xl:right-[-25px] top-[40%] -translate-y-1/2 z-20 p-2 bg-white dark:bg-slate-800 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
      )}
      </div>

      {/* Modal */}`;

content = content.replace(oldContainerEnd, newContainerEnd);

fs.writeFileSync(file, content);
