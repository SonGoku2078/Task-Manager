import { useState } from 'react';
import './CalendarPanel.css';

export default function CalendarPanel() {
  const [currentDate] = useState(new Date(2026, 5, 17)); // June 17, 2026

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

  const days: (number | null)[] = [];
  const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));

  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    days.push(prevMonthDays - i);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push(null);
  }

  const today = new Date();
  const isToday = (day: number | null) => {
    return day === today.getDate() &&
           currentDate.getMonth() === today.getMonth() &&
           currentDate.getFullYear() === today.getFullYear();
  };

  const isCurrentWeek = (day: number | null) => {
    if (!day) return false;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    return d >= weekStart && d <= weekEnd;
  };

  return (
    <div className="calendar-panel">
      <h3 className="calendar-title">Kalender</h3>

      <button className="btn-week">Diese Woche</button>

      <select className="month-select">
        <option>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</option>
      </select>

      <div className="weekdays">
        {weekDays.map((day) => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`cal-day ${!day ? 'other-month' : ''} ${isToday(day) ? 'today' : ''} ${isCurrentWeek(day) ? 'week-highlight' : ''}`}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  );
}
