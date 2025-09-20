import SwiftUI
import ComposableArchitecture

@main
struct VinhoApp: App {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    let store: StoreOf<AppReducer>

    init() {
        self.store = Store(initialState: AppReducer.State()) {
            AppReducer()
        }
    }

    var isIPad: Bool {
        horizontalSizeClass == .regular && verticalSizeClass == .regular
    }

    var body: some Scene {
        WindowGroup {
            if isIPad {
                IPadRootView(store: store)
            } else {
                IPhoneRootView(store: store)
            }
        }
    }
}

// MARK: - App Reducer
struct AppReducer: Reducer {
    struct State: Equatable {
        var selectedTab = Tab.home
        var scan = ScanFeature.State()
        var map = MapFeature.State()
        var journal = JournalFeature.State()
        var discover = DiscoverFeature.State()
        var lists = WineListsFeature.State()
        var user = UserFeature.State()

        enum Tab: String, CaseIterable, Identifiable {
            case home
            case scan
            case map
            case journal
            case discover
            case lists

            var id: String { rawValue }

            var title: String {
                switch self {
                case .home: return "Home"
                case .scan: return "Scan"
                case .map: return "Map"
                case .journal: return "Journal"
                case .discover: return "Discover"
                case .lists: return "Lists"
                }
            }

            var icon: String {
                switch self {
                case .home: return "house.fill"
                case .scan: return "camera.fill"
                case .map: return "map.fill"
                case .journal: return "book.fill"
                case .discover: return "sparkles"
                case .lists: return "list.bullet"
                }
            }
        }
    }

    enum Action: Equatable {
        case tabSelected(State.Tab)
        case scan(ScanFeature.Action)
        case map(MapFeature.Action)
        case journal(JournalFeature.Action)
        case discover(DiscoverFeature.Action)
        case lists(WineListsFeature.Action)
        case user(UserFeature.Action)
    }

    var body: some ReducerOf<Self> {
        Scope(state: \.scan, action: /Action.scan) {
            ScanFeature()
        }
        Scope(state: \.map, action: /Action.map) {
            MapFeature()
        }
        Scope(state: \.journal, action: /Action.journal) {
            JournalFeature()
        }
        Scope(state: \.discover, action: /Action.discover) {
            DiscoverFeature()
        }
        Scope(state: \.lists, action: /Action.lists) {
            WineListsFeature()
        }
        Scope(state: \.user, action: /Action.user) {
            UserFeature()
        }

        Reduce { state, action in
            switch action {
            case let .tabSelected(tab):
                state.selectedTab = tab
                return .none

            default:
                return .none
            }
        }
    }
}