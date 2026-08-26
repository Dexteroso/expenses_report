/* eslint-disable react-hooks/set-state-in-effect -- Value effect intentionally synchronizes visible calendar state. */
import { useEffect, useMemo, useRef, useState } from 'react';

const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

const weekdayLabels = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const parseDateValue = (value) => {
    if (!value) return null;

    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day);
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return date;
};

const formatDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const getMonthDays = (visibleDate) => {
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i += 1) {
        days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
        days.push(new Date(year, month, day));
    }

    return days;
};

function useMobileDateInput() {
    const [isMobile, setIsMobile] = useState(() => (
        typeof window !== 'undefined'
            ? window.matchMedia('(max-width: 767px)').matches
            : false
    ));

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleChange = () => setIsMobile(mediaQuery.matches);

        handleChange();
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return isMobile;
}

function DateInput({
    name,
    value,
    onChange,
    placeholder = 'Selecciona fecha',
    required = false,
    disabled = false,
    style,
    className = '',
    align = 'left',
}) {
    const isMobile = useMobileDateInput();
    const rootRef = useRef(null);
    const selectedDate = parseDateValue(value);
    const [isOpen, setIsOpen] = useState(false);
    const [visibleDate, setVisibleDate] = useState(() => selectedDate || new Date());
    const days = useMemo(() => getMonthDays(visibleDate), [visibleDate]);

    useEffect(() => {
        if (selectedDate) {
            setVisibleDate(selectedDate);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedDate is derived from value; keeping value as the trigger preserves current behavior.
    }, [value]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!isMobile) {
        return (
            <input
                type="date"
                name={name}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                required={required}
                disabled={disabled}
                style={style}
                className={`${className} ${value ? '' : 'is-placeholder'}`.trim()}
            />
        );
    }

    const handleMonthChange = (offset) => {
        setVisibleDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    };

    const handleSelectDate = (date) => {
        onChange(formatDateValue(date));
        setIsOpen(false);
    };

    return (
        <div
            ref={rootRef}
            className={`date-input ${align === 'right' ? 'date-input-align-right' : ''} ${className}`}
        >
            <button
                type="button"
                className={`date-input-control ${value ? '' : 'is-placeholder'}`}
                style={style}
                onClick={() => {
                    if (!disabled) setIsOpen((current) => !current);
                }}
                disabled={disabled}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <span>{value || placeholder}</span>
                <i className="bx bx-calendar" aria-hidden="true" />
            </button>

            {isOpen && !disabled && (
                <div className="date-picker-popover" role="dialog" aria-label="Seleccionar fecha">
                    <div className="date-picker-header">
                        <button type="button" onClick={() => handleMonthChange(-1)} aria-label="Mes anterior">
                            <i className="bx bx-chevron-left" aria-hidden="true" />
                        </button>
                        <strong>{monthNames[visibleDate.getMonth()]} de {visibleDate.getFullYear()}</strong>
                        <button type="button" onClick={() => handleMonthChange(1)} aria-label="Mes siguiente">
                            <i className="bx bx-chevron-right" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="date-picker-grid date-picker-weekdays">
                        {weekdayLabels.map((weekday) => (
                            <span key={weekday}>{weekday}</span>
                        ))}
                    </div>

                    <div className="date-picker-grid">
                        {days.map((day, index) => {
                            const dayValue = day ? formatDateValue(day) : `empty-${index}`;
                            const isSelected = day && value === dayValue;

                            return day ? (
                                <button
                                    type="button"
                                    key={dayValue}
                                    className={`date-picker-day ${isSelected ? 'is-selected' : ''}`}
                                    onClick={() => handleSelectDate(day)}
                                >
                                    {day.getDate()}
                                </button>
                            ) : (
                                <span key={dayValue} className="date-picker-day-placeholder" />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateInput;
