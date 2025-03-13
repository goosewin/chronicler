import { Search, SortAsc, SortDesc } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { Button } from "./ui/button";
import { DatePickerWithRange } from "./ui/date-range-picker";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type SortField = "version" | "releaseDate";
export type SortOrder = "asc" | "desc";

export interface ChangelogFilters {
  search: string;
  dateRange: DateRange | undefined;
  sortField: SortField;
  sortOrder: SortOrder;
}

interface ChangelogFiltersProps {
  onFiltersChange: (filters: ChangelogFilters) => void;
  initialFilters?: Partial<ChangelogFilters>;
}

export function ChangelogFilters({
  onFiltersChange,
  initialFilters,
}: ChangelogFiltersProps) {
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialFilters?.dateRange,
  );
  const [sortField, setSortField] = useState<SortField>(
    initialFilters?.sortField ?? "releaseDate",
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialFilters?.sortOrder ?? "desc",
  );

  const handleFiltersChange = useCallback(() => {
    onFiltersChange({
      search,
      dateRange,
      sortField,
      sortOrder,
    });
  }, [search, dateRange, sortField, sortOrder, onFiltersChange]);

  useEffect(() => {
    handleFiltersChange();
  }, [handleFiltersChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search changelogs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>
      <DatePickerWithRange date={dateRange} onSelect={setDateRange} />
      <Select
        value={sortField}
        onValueChange={(value) => setSortField(value as SortField)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="version">Version</SelectItem>
          <SelectItem value="releaseDate">Release Date</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
      >
        {sortOrder === "asc" ? (
          <SortAsc className="h-4 w-4" />
        ) : (
          <SortDesc className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
