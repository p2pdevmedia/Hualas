import SwiftUI

struct RootView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  var body: some View {
    Group {
      if sessionStore.isLoading {
        ProgressView("Cargando...")
      } else if sessionStore.isAuthenticated {
        if sessionStore.currentRole == .professor {
          ProfessorShellView()
        } else {
          MemberShellView()
        }
      } else {
        LoginView()
      }
    }
  }
}

struct MemberShellView: View {
  @StateObject private var cartStore = MemberCartStore()

  var body: some View {
    TabView {
      MemberDashboardView()
        .tabItem { Label("Inicio", systemImage: "house.fill") }
      ActivitiesView()
        .tabItem { Label("Mis actividades", systemImage: "calendar") }
      ChildrenView()
        .tabItem { Label("Hijos", systemImage: "person.2") }
      MoreTabView()
        .tabItem { Label("Más", systemImage: "ellipsis.circle") }
    }
    .environmentObject(cartStore)
  }
}

struct MoreTabView: View {
  var body: some View {
    NavigationStack {
      List {
        Section {
          NavigationLink {
            ProfileView()
          } label: {
            Label("Perfil", systemImage: "person.crop.circle")
          }

          NavigationLink {
            PaymentsView()
          } label: {
            Label("Pagos", systemImage: "creditcard")
          }

          NavigationLink {
            NewsView()
          } label: {
            Label("Noticias", systemImage: "newspaper")
          }
        }
      }
      .navigationTitle("Más")
    }
  }
}

struct ProfessorShellView: View {
  var body: some View {
    TabView {
      ActivitiesView()
        .tabItem { Label("Mis actividades", systemImage: "calendar") }
      GroupsView()
        .tabItem { Label("Grupos", systemImage: "rectangle.grid.2x2") }
      AttendanceView()
        .tabItem { Label("Asistencia", systemImage: "checklist") }
      ProfileView()
        .tabItem { Label("Perfil", systemImage: "person.crop.circle") }
    }
  }
}
