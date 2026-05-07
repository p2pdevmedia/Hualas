import SwiftUI

struct ProfessorDashboardView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var home: MobileHomeResponse?

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          Text("Home profesor")
            .font(.largeTitle.bold())
          Text("Seguimiento de grupos y asistencia.")
            .foregroundStyle(.secondary)

          if let home {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
              metricCard(title: "Actividades", value: "\(home.stats.activitiesCount)")
              metricCard(title: "Grupos", value: "\(home.stats.groupsCount ?? 0)")
              metricCard(title: "Asistencias", value: "\(home.stats.pendingAttendanceCount ?? 0)")
              metricCard(title: "Novedades", value: "\(home.stats.unreadNotificationsCount)")
            }

            Text("Próximos días").font(.headline)
            ForEach(home.upcomingDays.prefix(3)) { day in
              card {
                Text(day.activityName).font(.headline)
                Text("\(day.date ?? "Fecha pendiente") · \(day.schedule)")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
                Text(day.groupName ?? "Sin grupo").font(.footnote)
              }
            }
          }
        }
        .padding()
      }
      .task { await load() }
      .refreshable { await load() }
      .toolbar(.hidden, for: .navigationBar)
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      home = try await APIClient.shared.home(token: token)
    } catch {
      guard !error.isCancellationError else { return }
      print("[professor home] load failed", error)
    }
  }
}

private extension ProfessorDashboardView {
  func metricCard(title: String, value: String) -> some View {
    card {
      Text(title).font(.caption).foregroundStyle(.secondary)
      Text(value).font(.title2.bold())
    }
  }

  func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
  }
}
