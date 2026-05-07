import SwiftUI

struct ChildrenView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var children: [MobileChildrenResponse.Child] = []

  var body: some View {
    NavigationStack {
      List(children) { child in
        VStack(alignment: .leading, spacing: 4) {
          Text([child.name, child.lastName].compactMap { $0 }.joined(separator: " "))
            .font(.headline)
          if let birthDate = child.birthDate {
            Text("Nacido: \(birthDate)").foregroundStyle(.secondary)
          }
          if let address = child.address, !address.isEmpty {
            Text(address).font(.footnote).foregroundStyle(.secondary)
          }
        }
      }
      .navigationTitle("Mis hijos")
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.children(token: token)
      children = response.children
    } catch {
      print("[children] load failed", error)
    }
  }
}

