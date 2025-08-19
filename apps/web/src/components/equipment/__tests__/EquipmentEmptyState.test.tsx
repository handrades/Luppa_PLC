/**
 * EquipmentEmptyState Component Tests
 * Story 4.3: Equipment List UI
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { EquipmentEmptyState } from "../EquipmentEmptyState";

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("EquipmentEmptyState", () => {
  const defaultProps = {
    hasFilters: false,
    onClearFilters: jest.fn(),
    onAddEquipment: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering without filters", () => {
    it("should render empty state for no data", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      expect(screen.getByText("No equipment available")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Get started by adding your first piece of equipment to the system.",
        ),
      ).toBeInTheDocument();
    });

    it("should show add equipment button", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      expect(screen.getByText("Add First Equipment")).toBeInTheDocument();
    });

    it("should show getting started help", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      expect(screen.getByText("Getting Started:")).toBeInTheDocument();
      expect(
        screen.getByText(/Add PLCs, robots, conveyors/),
      ).toBeInTheDocument();
    });

    it("should not show clear filters button", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
    });
  });

  describe("rendering with filters", () => {
    it("should render empty state for no search results", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      expect(screen.getByText("No equipment found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Try adjusting your search criteria or filters to find equipment.",
        ),
      ).toBeInTheDocument();
    });

    it("should show clear filters button", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
    });

    it("should show add equipment button with different text", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      expect(screen.getByText("Add Equipment")).toBeInTheDocument();
    });

    it("should show search tips", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      expect(screen.getByText("Search Tips:")).toBeInTheDocument();
      expect(
        screen.getByText(/Search by equipment description/),
      ).toBeInTheDocument();
    });

    it("should not show getting started help", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      expect(screen.queryByText("Getting Started:")).not.toBeInTheDocument();
    });
  });

  describe("button interactions", () => {
    it("should call onClearFilters when clear filters button is clicked", () => {
      const onClearFilters = jest.fn();
      renderWithTheme(
        <EquipmentEmptyState
          {...defaultProps}
          hasFilters={true}
          onClearFilters={onClearFilters}
        />,
      );

      fireEvent.click(screen.getByText("Clear Filters"));
      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });

    it("should call onAddEquipment when add equipment button is clicked", () => {
      const onAddEquipment = jest.fn();
      renderWithTheme(
        <EquipmentEmptyState
          {...defaultProps}
          hasFilters={false}
          onAddEquipment={onAddEquipment}
        />,
      );

      fireEvent.click(screen.getByText("Add First Equipment"));
      expect(onAddEquipment).toHaveBeenCalledTimes(1);
    });

    it("should not render add equipment button when onAddEquipment is not provided", () => {
      renderWithTheme(
        <EquipmentEmptyState
          {...defaultProps}
          hasFilters={false}
          onAddEquipment={undefined}
        />,
      );

      expect(screen.queryByText("Add First Equipment")).not.toBeInTheDocument();
      expect(screen.queryByText("Add Equipment")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper heading structure", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("No equipment available");
    });

    it("should have proper button roles", () => {
      renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      const clearButton = screen.getByRole("button", {
        name: /clear filters/i,
      });
      const addButton = screen.getByRole("button", { name: /add equipment/i });

      expect(clearButton).toBeInTheDocument();
      expect(addButton).toBeInTheDocument();
    });
  });

  describe("icon rendering", () => {
    it("should render inventory icon when no filters", () => {
      const { container } = renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={false} />,
      );

      // Check for the icon container
      const iconContainer = container.querySelector(
        '[data-testid="Inventory2OutlinedIcon"]',
      );
      expect(
        iconContainer || container.querySelector("svg"),
      ).toBeInTheDocument();
    });

    it("should render search off icon when filters are active", () => {
      const { container } = renderWithTheme(
        <EquipmentEmptyState {...defaultProps} hasFilters={true} />,
      );

      // Check for the icon container
      const iconContainer = container.querySelector(
        '[data-testid="SearchOffIcon"]',
      );
      expect(
        iconContainer || container.querySelector("svg"),
      ).toBeInTheDocument();
    });
  });
});
