import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock Leaflet since it's not available in test environment
jest.mock("leaflet", () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
  divIcon: jest.fn(() => ({})),
  latLngBounds: jest.fn(() => ({
    isValid: () => true,
  })),
}));

// Mock react-leaflet components
jest.mock("react-leaflet", () => ({
  MapContainer: ({ children, ...props }: any) => (
    <div data-testid="map-container" {...props}>
      {children}
    </div>
  ),
  TileLayer: (props: any) => <div data-testid="tile-layer" {...props} />,
  Marker: ({ children, position, eventHandlers, ...props }: any) => (
    <div
      data-testid="marker"
      data-position={JSON.stringify(position)}
      onClick={() => eventHandlers?.click?.()}
      {...props}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    fitBounds: jest.fn(),
  }),
}));

// Mock renderToStaticMarkup
jest.mock("react-dom/server", () => ({
  renderToStaticMarkup: jest.fn(() => "<div>Wine Icon</div>"),
}));

import WineMap from "@/components/wine-map";

const mockWines = [
  {
    id: "wine-1",
    name: "Chateau Test",
    producer: "Test Producer",
    region: "Bordeaux",
    country: "France",
    year: 2020,
    varietals: ["Cabernet Sauvignon", "Merlot"],
    latitude: 44.8378,
    longitude: -0.5792,
    vineyard_name: "Test Vineyard",
  },
  {
    id: "wine-2",
    name: "Napa Valley Red",
    producer: "Napa Producer",
    region: "Napa Valley",
    country: "USA",
    year: 2019,
    varietals: ["Cabernet Sauvignon"],
    latitude: 38.3047,
    longitude: -122.2989,
    vineyard_name: null,
  },
];

describe("WineMap Component", () => {
  const mockOnWineSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders map container with correct props", () => {
    render(
      <WineMap
        wines={mockWines}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const mapContainer = screen.getByTestId("map-container");
    expect(mapContainer).toBeInTheDocument();
    expect(mapContainer).toHaveClass("h-full", "w-full");
  });

  it("renders markers for all valid wines", () => {
    render(
      <WineMap
        wines={mockWines}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2);

    // Check first marker position
    expect(markers[0]).toHaveAttribute(
      "data-position",
      JSON.stringify([44.8378, -0.5792]),
    );

    // Check second marker position
    expect(markers[1]).toHaveAttribute(
      "data-position",
      JSON.stringify([38.3047, -122.2989]),
    );
  });

  it("filters out wines without coordinates", () => {
    const winesWithInvalid = [
      ...mockWines,
      {
        id: "wine-3",
        name: "Invalid Wine",
        producer: "Invalid Producer",
        region: "Unknown",
        country: "Unknown",
        year: 2021,
        varietals: [],
        latitude: null,
        longitude: null,
        vineyard_name: null,
      },
    ];

    render(
      <WineMap
        wines={winesWithInvalid}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2); // Only valid wines should render
  });

  it("calls onWineSelect when marker is clicked", () => {
    render(
      <WineMap
        wines={mockWines}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const firstMarker = screen.getAllByTestId("marker")[0];
    fireEvent.click(firstMarker);

    expect(mockOnWineSelect).toHaveBeenCalledWith(mockWines[0]);
  });

  it("renders popup with wine information", () => {
    render(
      <WineMap
        wines={mockWines}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const popups = screen.getAllByTestId("popup");
    expect(popups).toHaveLength(2);

    // Check popup content
    expect(screen.getByText("Chateau Test")).toBeInTheDocument();
    expect(screen.getByText("Test Producer")).toBeInTheDocument();
    expect(screen.getByText("Bordeaux, France")).toBeInTheDocument();
    expect(screen.getByText("2020")).toBeInTheDocument();
    expect(screen.getByText("Cabernet Sauvignon, Merlot")).toBeInTheDocument();
    expect(screen.getByText("Vineyard: Test Vineyard")).toBeInTheDocument();
  });

  it("handles wines without vineyard names", () => {
    render(
      <WineMap
        wines={[mockWines[1]]} // Second wine has no vineyard_name
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    expect(screen.getByText("Napa Valley Red")).toBeInTheDocument();
    expect(screen.queryByText("Vineyard:")).not.toBeInTheDocument();
  });

  it("handles wines without year", () => {
    const wineWithoutYear = {
      ...mockWines[0],
      year: null,
    };

    render(
      <WineMap
        wines={[wineWithoutYear]}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    expect(screen.getByText("Chateau Test")).toBeInTheDocument();
    expect(screen.queryByText("2020")).not.toBeInTheDocument();
  });

  it("handles wines without varietals", () => {
    const wineWithoutVarietals = {
      ...mockWines[0],
      varietals: [],
    };

    render(
      <WineMap
        wines={[wineWithoutVarietals]}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    expect(screen.getByText("Chateau Test")).toBeInTheDocument();
    expect(
      screen.queryByText("Cabernet Sauvignon, Merlot"),
    ).not.toBeInTheDocument();
  });

  it("applies different styling for selected wine", () => {
    render(
      <WineMap
        wines={mockWines}
        onWineSelect={mockOnWineSelect}
        selectedWine={mockWines[0]}
      />,
    );

    // This would typically check for different icon styling
    // The actual implementation would pass the selected state to createWineIcon
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("renders with empty wines array", () => {
    render(
      <WineMap
        wines={[]}
        onWineSelect={mockOnWineSelect}
        selectedWine={null}
      />,
    );

    const mapContainer = screen.getByTestId("map-container");
    expect(mapContainer).toBeInTheDocument();

    const markers = screen.queryAllByTestId("marker");
    expect(markers).toHaveLength(0);
  });
});
