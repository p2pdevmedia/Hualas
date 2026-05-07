import SwiftUI

struct MemberDashboardView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var home: MobileHomeResponse?
  @State private var isLoading = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          header
          if let home {
            statsGrid(home.stats)
            if let children = home.children, !children.isEmpty {
              sectionTitle("Mis hijos")
              ForEach(children.prefix(3)) { child in
                dashboardCard {
                  Text([child.name, child.lastName].compactMap { $0 }.joined(separator: " "))
                  if let birthDate = child.birthDate {
                    Text(birthDate).font(.footnote).foregroundStyle(.secondary)
                  }
                }
              }
            }
            sectionTitle("Próximas actividades")
            ForEach(home.upcomingDays.prefix(3)) { day in
              dashboardCard {
                Text(day.activityName).font(.headline)
                Text("\(day.date ?? "Fecha pendiente") · \(day.schedule)")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
                Text(day.geoLocation).font(.footnote).foregroundStyle(.secondary)
              }
            }
          } else if isLoading {
            ProgressView()
          } else {
            Text("Sin datos todavía.")
              .foregroundStyle(.secondary)
          }
        }
        .padding()
      }
      .navigationTitle("Home socio")
      .task {
        await load()
      }
      .refreshable {
        await load()
      }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("Hola, \(home?.profile.name ?? sessionStore.me?.user.name ?? "socio")")
        .font(.title.bold())
      Text("Revisá hijos, actividades, pagos y noticias.")
        .foregroundStyle(.secondary)
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    isLoading = true
    defer { isLoading = false }
    do {
      home = try await APIClient.shared.home(token: token)
    } catch {
      print("[member home] load failed", error)
    }
  }
}

private extension MemberDashboardView {
  func sectionTitle(_ text: String) -> some View {
    Text(text).font(.headline)
  }

  func dashboardCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
  }

  func statsGrid(_ stats: MobileHomeResponse.Stats) -> some View {
    let items = [
      ("Hijos", stats.childrenCount ?? 0),
      ("Actividades", stats.activitiesCount),
      ("Próximos días", stats.upcomingDaysCount),
      ("Notificaciones", stats.unreadNotificationsCount),
    ]
    return LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
      ForEach(items, id: \.0) { item in
        dashboardCard {
          Text(item.0).font(.caption).foregroundStyle(.secondary)
          Text("\(item.1)").font(.title2.bold())
        }
      }
    }
  }
}

