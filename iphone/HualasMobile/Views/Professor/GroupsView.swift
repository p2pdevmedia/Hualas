import SwiftUI

struct GroupsView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var groups: [MobileGroupsResponse.Group] = []

  var body: some View {
    NavigationStack {
      List(groups) { group in
        VStack(alignment: .leading, spacing: 6) {
          Text(group.name).font(.headline)
          Text(group.activity.name).font(.footnote).foregroundStyle(.secondary)
          Text("\(group.memberCount) integrantes")
            .font(.footnote)
        }
      }
      .navigationTitle("Grupos")
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.professorGroups(token: token)
      groups = response.groups
    } catch {
      print("[groups] load failed", error)
    }
  }
}

