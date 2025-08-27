/**
 * SearchBar Component Tests
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "../SearchBar";
import { useSearchStore } from "../../../stores/search.store";

// Mock the search store
jest.mock("../../../stores/search.store");
const mockUseSearchStore = useSearchStore as jest.MockedFunction<typeof useSearchStore>;

// Mock debounce hook
jest.mock("../../../hooks/useDebounce", () => ({
  useDebounce: (value: unknown, _delay: number) => value, // Return value immediately for testing
}));

describe("SearchBar", () => {
  const mockSetQuery = jest.fn();
  const mockExecuteSearch = jest.fn();
  const mockAddToHistory = jest.fn();
  const mockGetSuggestions = jest.fn();
  const mockClearSuggestions = jest.fn();

  const defaultStoreValues = {
    query: "",
    recentSearches: [],
    suggestions: [],
    loading: false,
    setQuery: mockSetQuery,
    executeSearch: mockExecuteSearch,
    addToHistory: mockAddToHistory,
    getSuggestions: mockGetSuggestions,
    clearSuggestions: mockClearSuggestions,
  };

  beforeEach(() => {
    mockUseSearchStore.mockReturnValue(defaultStoreValues as ReturnType<typeof useSearchStore>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("should render search input with placeholder", () => {
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      expect(input).toBeInTheDocument();
    });

    it("should render search icon", () => {
      render(<SearchBar />);

      const searchIcon = screen.getByTestId("SearchIcon");
      expect(searchIcon).toBeInTheDocument();
    });

    it("should render help icon when showHelp is true", () => {
      render(<SearchBar showHelp={true} />);

      const helpIcon = screen.getByLabelText("Search help");
      expect(helpIcon).toBeInTheDocument();
    });

    it("should not render help icon when showHelp is false", () => {
      render(<SearchBar showHelp={false} />);

      const helpIcon = screen.queryByLabelText("Search help");
      expect(helpIcon).not.toBeInTheDocument();
    });
  });

  describe("input handling", () => {
    it("should update input value when typing", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "Siemens");

      expect(input).toHaveValue("Siemens");
    });

    it("should call onSearch when Enter is pressed", async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "test query");
      await user.keyboard("{Enter}");

      expect(mockOnSearch).toHaveBeenCalledWith("test query");
    });

    it("should not call onSearch for empty query", async () => {
      const mockOnSearch = jest.fn();
      const user = userEvent.setup();

      render(<SearchBar onSearch={mockOnSearch} />);

      // Get input but don't need to use it

      await user.keyboard("{Enter}");

      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it("should call store actions when search is executed", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "test query");
      await user.keyboard("{Enter}");

      expect(mockSetQuery).toHaveBeenCalledWith("test query");
      expect(mockAddToHistory).toHaveBeenCalledWith("test query");
    });
  });

  describe("clear functionality", () => {
    it("should show clear button when input has value", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "test");

      const clearButton = screen.getByLabelText("Clear search");
      expect(clearButton).toBeInTheDocument();
    });

    it("should clear input when clear button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "test");

      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      expect(input).toHaveValue("");
    });

    it("should call onClear callback when clear button is clicked", async () => {
      const mockOnClear = jest.fn();
      const user = userEvent.setup();

      render(<SearchBar onClear={mockOnClear} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      await user.type(input, "test");

      const clearButton = screen.getByLabelText("Clear search");
      await user.click(clearButton);

      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe("suggestions", () => {
    it("should show recent searches when input is empty", async () => {
      const recentSearches = [
        { query: "Siemens PLC", timestamp: new Date(), resultCount: 5, executionTime: 50 },
        { query: "S7-1200", timestamp: new Date(), resultCount: 3, executionTime: 30 },
      ];

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        recentSearches,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      await user.click(input);

      await waitFor(() => {
        expect(screen.getByText("Siemens PLC")).toBeInTheDocument();
        expect(screen.getByText("S7-1200")).toBeInTheDocument();
      });
    });

    it("should show suggestions when typing", async () => {
      const suggestions = ["Siemens S7", "Siemens PLC", "Siemens 1200"];

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        suggestions,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      await user.type(input, "Siem");

      await waitFor(() => {
        suggestions.forEach(suggestion => {
          expect(screen.getByText(suggestion)).toBeInTheDocument();
        });
      });
    });

    it("should execute search when suggestion is selected", async () => {
      const suggestions = ["Siemens S7"];
      const mockOnSearch = jest.fn();

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        suggestions,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      await user.type(input, "Siem");

      await waitFor(() => {
        expect(screen.getByText("Siemens S7")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Siemens S7"));

      expect(mockOnSearch).toHaveBeenCalledWith("Siemens S7");
    });
  });

  describe("loading state", () => {
    it("should show loading spinner when loading", () => {
      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        suggestionsLoading: true,
        loading: false, // Keep for other parts of the component
      } as ReturnType<typeof useSearchStore>);

      render(<SearchBar />);

      const spinner = screen.getByRole("progressbar");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("keyboard navigation", () => {
    it("should close suggestions when Escape is pressed", async () => {
      const suggestions = ["Siemens S7"];

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        suggestions,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      await user.type(input, "Siem");

      await waitFor(() => {
        expect(screen.getByText("Siemens S7")).toBeInTheDocument();
      });

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByText("Siemens S7")).not.toBeInTheDocument();
      });
    });
  });

  describe("help modal", () => {
    it("should open help modal when help icon is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchBar showHelp={true} />);

      const helpButton = screen.getByLabelText("Search help");
      await user.click(helpButton);

      expect(screen.getByText("Search Help")).toBeInTheDocument();
      expect(screen.getByText("Search Tips:")).toBeInTheDocument();
    });

    it("should close help modal when close button is clicked", async () => {
      const user = userEvent.setup();
      render(<SearchBar showHelp={true} />);

      const helpButton = screen.getByLabelText("Search help");
      await user.click(helpButton);

      const closeButton = screen.getByLabelText("Close help");
      await user.click(closeButton);

      expect(screen.queryByText("Search Help")).not.toBeInTheDocument();
    });

    it("should show recent searches in help modal", async () => {
      const recentSearches = [
        { query: "Siemens PLC", timestamp: new Date(), resultCount: 5, executionTime: 50 },
        { query: "S7-1200", timestamp: new Date(), resultCount: 3, executionTime: 30 },
      ];

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        recentSearches,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar showHelp={true} />);

      const helpButton = screen.getByLabelText("Search help");
      await user.click(helpButton);

      expect(screen.getByText("Recent Searches:")).toBeInTheDocument();
      expect(screen.getByText("Siemens PLC")).toBeInTheDocument();
      expect(screen.getByText("S7-1200")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<SearchBar />);

      const input = screen.getByLabelText("Equipment search");
      expect(input).toBeInTheDocument();

      const searchButton = screen.getByLabelText("Search help");
      expect(searchButton).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<SearchBar />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");

      // Tab to input
      await user.tab();
      expect(input).toHaveFocus();

      // Type and press Enter
      await user.type(input, "test");
      await user.keyboard("{Enter}");

      expect(mockSetQuery).toHaveBeenCalledWith("test");
    });
  });

  describe("props handling", () => {
    it("should respect disabled prop", () => {
      render(<SearchBar disabled={true} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      expect(input).toBeDisabled();
    });

    it("should use custom placeholder", () => {
      render(<SearchBar placeholder="Custom placeholder" />);

      const input = screen.getByPlaceholderText("Custom placeholder");
      expect(input).toBeInTheDocument();
    });

    it("should apply autoFocus when specified", () => {
      render(<SearchBar autoFocus={true} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      expect(input).toHaveFocus();
    });

    it("should respect maxSuggestions prop", async () => {
      const suggestions = Array.from({ length: 20 }, (_, i) => `Suggestion ${i}`);

      mockUseSearchStore.mockReturnValue({
        ...defaultStoreValues,
        suggestions,
      } as ReturnType<typeof useSearchStore>);

      const user = userEvent.setup();
      render(<SearchBar maxSuggestions={5} />);

      const input = screen.getByPlaceholderText("Search equipment, PLCs, sites...");
      await user.type(input, "test");

      // Should call getSuggestions with limit of 5
      expect(mockGetSuggestions).toHaveBeenCalledWith("test", 5);
    });
  });
});
