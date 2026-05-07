import SwiftUI

struct ActivitiesView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var activities: [MobileActivitiesResponse.Activity] = []

  var body: some View {
    NavigationStack {
      List(activities) { activity in
        VStack(alignment: .leading, spacing: 4) {
          Text(activity.name).font(.headline)
          Text(activity.date ?? "Fecha pendiente")
            .foregroundStyle(.secondary)
          if let description = activity.description, !description.isEmpty {
            Text(description).font(.footnote).foregroundStyle(.secondary)
          }
        }
      }
      .navigationTitle("Mis actividades")
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.activities(token: token)
      activities = response.activities
    } catch {
      print("[activities] load failed", error)
    }
  }
}

