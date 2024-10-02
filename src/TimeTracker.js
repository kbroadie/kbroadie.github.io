import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const departments = [
  'Homelessness', 'Public Safety', 'E&E', 'Housing First',
  'DCE', 'I-REN', 'Transportation', 'ACCESS',
  'Arts & Music', 'CV Link', 'CV Sync', 'CVCC'
];

const backgroundColors = {
  'Homelessness': '#3D3520', 'Public Safety': '#3D2320', 'E&E': '#203D20',
  'Housing First': '#20203D', 'DCE': '#3D2E20', 'I-REN': '#2E203D',
  'Transportation': '#20303D', 'ACCESS': '#3D2037', 'Arts & Music': '#3D203D',
  'CV Link': '#203D2E', 'CV Sync': '#203D3A', 'CVCC': '#3D2626'
};

const DEFAULT_BG_COLOR = '#1E2124';
const TIMEZONE = 'America/Los_Angeles';

const createInitialTimers = () => departments.reduce((acc, dept) => ({
  ...acc,
  [dept]: { isActive: false, time: 0 }
}), {});

const getTodayDate = () => {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE }).format(new Date());
};

const initialState = {
  currentDate: getTodayDate(),
  timers: {},
};

const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('localStorage is not available:', e);
    return false;
  }
};

const saveState = (state) => {
  if (isLocalStorageAvailable()) {
    try {
      const serializedState = JSON.stringify(state);
      localStorage.setItem('timeTrackerState', serializedState);
      console.log('State saved successfully:', serializedState);
    } catch (err) {
      console.error('Failed to save state to localStorage:', err);
    }
  }
};

const loadState = () => {
  if (isLocalStorageAvailable()) {
    try {
      const serializedState = localStorage.getItem('timeTrackerState');
      if (serializedState === null) {
        console.log('No saved state found in localStorage');
        return undefined;
      }
      const parsedState = JSON.parse(serializedState);
      console.log('Loaded state from localStorage:', parsedState);
      return parsedState;
    } catch (err) {
      console.error('Failed to load state from localStorage:', err);
      return undefined;
    }
  }
  return undefined;
};

function reducer(state, action) {
  let newState;
  switch (action.type) {
    case 'INIT_STATE':
      newState = action.payload;
      break;
    case 'INCREMENT_TIMER':
      newState = {
        ...state,
        timers: {
          ...state.timers,
          [state.currentDate]: {
            ...state.timers[state.currentDate],
            [action.payload]: {
              ...state.timers[state.currentDate]?.[action.payload],
              time: (state.timers[state.currentDate]?.[action.payload]?.time || 0) + 1
            }
          }
        }
      };
      break;
    case 'TOGGLE_TIMER':
      const currentDateTimers = state.timers[state.currentDate] || {};
      const newTimers = { ...currentDateTimers };
      Object.keys(newTimers).forEach(dept => {
        if (dept !== action.payload && newTimers[dept]?.isActive) {
          newTimers[dept] = { ...newTimers[dept], isActive: false };
        }
      });
      newTimers[action.payload] = {
        ...newTimers[action.payload],
        isActive: !(newTimers[action.payload]?.isActive || false)
      };
      newState = {
        ...state,
        timers: {
          ...state.timers,
          [state.currentDate]: newTimers
        }
      };
      break;
    case 'ADJUST_TIME':
      const { dept, direction } = action.payload;
      const currentTime = state.timers[state.currentDate]?.[dept]?.time || 0;
      const currentMinutes = Math.floor(currentTime / 60);
      const roundedMinutes = Math.round(currentMinutes / 15) * 15;
      const adjustment = direction === 'up' ? 15 : -15;
      const newMinutes = Math.max(0, roundedMinutes + adjustment);
      newState = {
        ...state,
        timers: {
          ...state.timers,
          [state.currentDate]: {
            ...state.timers[state.currentDate],
            [dept]: {
              ...state.timers[state.currentDate]?.[dept],
              time: newMinutes * 60
            }
          }
        }
      };
      break;
    case 'CHANGE_DATE':
      newState = { ...state, currentDate: action.payload };
      break;
    default:
      return state;
  }
  console.log('State updated:', newState);
  return newState;
}

const TimeTracker = () => {
  const [state, dispatch] = useReducer(reducer, initialState, (initial) => {
    const loadedState = loadState();
    if (loadedState) {
      // Ensure the currentDate is today's date in LA timezone
      const today = getTodayDate();
      loadedState.currentDate = today;
      
      // If there are no timers for today, create them
      if (!loadedState.timers[today]) {
        console.log('Creating new timers for today');
        loadedState.timers[today] = createInitialTimers();
      }
      
      return loadedState;
    }
    return initial;
  });

  const lastUpdateTime = useRef(Date.now());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdateTime.current) / 1000);
      
      if (elapsedSeconds > 0) {
        const currentDateTimers = state.timers[state.currentDate];
        if (currentDateTimers) {
          Object.keys(currentDateTimers).forEach(dept => {
            if (currentDateTimers[dept]?.isActive) {
              for (let i = 0; i < elapsedSeconds; i++) {
                dispatch({ type: 'INCREMENT_TIMER', payload: dept });
              }
            }
          });
        }
        lastUpdateTime.current = now;
      }
    };

    const intervalId = setInterval(updateTimers, 1000);  // Update every second

    return () => clearInterval(intervalId);
  }, [state.timers, state.currentDate]);

  const toggleTimer = useCallback((dept) => {
    dispatch({ type: 'TOGGLE_TIMER', payload: dept });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.match(/^F(\d+)$/)) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(e.key.slice(1)) - 1;
        if (index >= 0 && index < departments.length) {
          toggleTimer(departments[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [toggleTimer]);

  const adjustTime = (dept, direction) => {
    dispatch({ type: 'ADJUST_TIME', payload: { dept, direction } });
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: TIMEZONE
    }).format(date);
  };

  const changeDate = (direction) => {
    const currentDate = new Date(state.currentDate);
    currentDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    const newDate = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE }).format(currentDate);
    dispatch({ type: 'CHANGE_DATE', payload: newDate });
  };

  const increaseLuminosity = (color, amount) => {
    const hex = color.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <div 
      className="h-screen flex flex-col transition-colors duration-500 ease-in-out p-2 sm:p-4" 
      style={{ backgroundColor: DEFAULT_BG_COLOR, fontFamily: "'Chivo Mono', monospace" }}
    >
      <div className="flex justify-between items-center mb-2">
        <button onClick={() => changeDate('prev')}><ChevronLeft size={18} color="white" /></button>
        <h2 className="text-xs sm:text-sm text-white font-light">{formatDate(state.currentDate)}</h2>
        <button onClick={() => changeDate('next')}><ChevronRight size={18} color="white" /></button>
      </div>
      <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 auto-rows-fr">
        {departments.map((dept) => {
          const activeColor = backgroundColors[dept];
          const lighterColor = increaseLuminosity(activeColor, 60);
          const isActive = state.timers[state.currentDate]?.[dept]?.isActive || false;
          const buttonBgColor = isActive ? lighterColor : activeColor;
          return (
            <div 
              key={dept} 
              className="flex flex-col justify-between cursor-pointer rounded-lg overflow-hidden"
              style={{
                background: isActive 
                  ? `linear-gradient(to bottom, ${lighterColor} 0%, ${activeColor} 100%)`
                  : 'transparent',
                border: isActive ? 'none' : `1px solid #4A4A4A`,
                transition: 'all 0.15s ease-in-out'
              }}
              onClick={() => toggleTimer(dept)}
            >
              <div className="flex justify-between items-baseline p-1 sm:p-2">
                <h2 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl truncate" style={{ 
                  color: isActive ? 'white' : increaseLuminosity(activeColor, 30)
                }}>
                  {dept}
                </h2>
                <p className="text-xs sm:text-sm md:text-base lg:text-lg font-light" style={{ 
                  color: isActive ? 'white' : increaseLuminosity(activeColor, 30)
                }}>
                  F{departments.indexOf(dept) + 1}
                </p>
              </div>
              <div className="flex-grow flex items-center justify-center">
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl w-full text-center font-medium" style={{ 
                  color: increaseLuminosity(buttonBgColor, 100),
                  letterSpacing: '0.05em'
                }}>
                  {formatTime(state.timers[state.currentDate]?.[dept]?.time || 0)}
                </p>
              </div>
              <div className="flex">
                <button 
                  onClick={(e) => { e.stopPropagation(); adjustTime(dept, 'down'); }}
                  className="w-1/2 h-8 sm:h-10 md:h-12 flex items-center justify-center transition-all duration-300 hover:bg-opacity-20 active:bg-opacity-30 focus:outline-none"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    transform: 'translateY(0)',
                    transition: 'transform 0.1s ease-in-out, background-color 0.3s ease-in-out'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <ChevronDown size={20} color={increaseLuminosity(buttonBgColor, 80)} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); adjustTime(dept, 'up'); }}
                  className="w-1/2 h-8 sm:h-10 md:h-12 flex items-center justify-center transition-all duration-300 hover:bg-opacity-20 active:bg-opacity-30 focus:outline-none"
                  style={{ 
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    transform: 'translateY(0)',
                    transition: 'transform 0.1s ease-in-out, background-color 0.3s ease-in-out'
                  }}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'translateY(2px)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <ChevronUp size={20} color={increaseLuminosity(buttonBgColor, 80)} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeTracker;