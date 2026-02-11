import { useState } from "react";
import {
  Filter,
  Check,
  SortAsc,
  SortDesc,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function FilterMenu() {
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showTop10, setShowTop10] = useState(true);
  const [showTop30, setShowTop30] = useState(false);
  const [showNotRanked, setShowNotRanked] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          <span>Filter & Sort</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        {/* Sort By Section */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <SortAsc className="h-3.5 w-3.5" />
          <span>Sort by</span>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
          <DropdownMenuRadioItem value="date">
            <Calendar className="mr-2 h-4 w-4" />
            <span>Date</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="position">
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Position</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="keyword">
            <span className="mr-2 flex h-4 w-4 items-center justify-center text-xs">
              A
            </span>
            <span>Keyword</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Sort Order */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <SortDesc className="h-3.5 w-3.5" />
          <span>Order</span>
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={sortOrder} onValueChange={setSortOrder}>
          <DropdownMenuRadioItem value="asc">
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>Ascending</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">
            <TrendingDown className="mr-2 h-4 w-4" />
            <span>Descending</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Filter Options */}
        <DropdownMenuLabel className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          <span>Show results</span>
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={showTop10}
            onCheckedChange={setShowTop10}
          >
            <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-green-100 text-xs font-semibold text-green-700">
              10
            </span>
            <span>Top 1-10</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showTop30}
            onCheckedChange={setShowTop30}
          >
            <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-yellow-100 text-xs font-semibold text-yellow-700">
              30
            </span>
            <span>Top 11-30</span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={showNotRanked}
            onCheckedChange={setShowNotRanked}
          >
            <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-sm bg-secondary text-xs font-semibold text-muted-foreground">
              N/A
            </span>
            <span>Not ranked</span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Reset Button */}
        <DropdownMenuItem
          className="justify-center font-medium"
          onClick={() => {
            setSortBy("date");
            setSortOrder("desc");
            setShowTop10(true);
            setShowTop30(false);
            setShowNotRanked(false);
          }}
        >
          Reset filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
