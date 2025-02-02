import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, parse } from "date-fns";
import { Label } from "@/components/ui/label";
import type { DateFieldGroup as DateFieldGroupType } from "@/types/form-definition";

const MONTH_MAP: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

interface DateFieldGroupProps {
  dateGroup: DateFieldGroupType;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  visible: boolean;
}

const DateFieldGroup = ({ dateGroup, values, onChange, visible }: DateFieldGroupProps) => {
  const { dayField, monthField, yearField } = dateGroup;
  
  // Convert individual values to Date object
  const date = useMemo(() => {
    if (!values[dayField.name] || !values[monthField.name] || !values[yearField.name]) {
      return undefined;
    }

    try {
      const day = parseInt(values[dayField.name]);
      const month = MONTH_MAP[values[monthField.name].toUpperCase()] ?? parseInt(values[monthField.name]) - 1;
      const year = parseInt(values[yearField.name]);

      if (isNaN(day) || isNaN(month) || isNaN(year)) {
        return undefined;
      }

      const date = new Date(year, month, day);
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return undefined;
    }
  }, [values, dayField.name, monthField.name, yearField.name]);

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      // Get month name from month number
      const monthName = Object.keys(MONTH_MAP).find(
        key => MONTH_MAP[key] === newDate.getMonth()
      ) || (newDate.getMonth() + 1).toString();

      onChange(dayField.name, newDate.getDate().toString());
      onChange(monthField.name, monthName);
      onChange(yearField.name, newDate.getFullYear().toString());
    }
  };

  if (!visible) return null;

  return (
    <div className="flex flex-col space-y-2">
      <Label>{dateGroup.basePhrase}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] pl-3 text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            {date && !isNaN(date.getTime()) 
              ? format(date, "PPP") 
              : <span>Pick a date</span>
            }
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date && !isNaN(date.getTime()) ? date : undefined}
            onSelect={handleDateChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateFieldGroup;