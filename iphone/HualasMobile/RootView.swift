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
  var body: some View {
    TabView {
      ActivitiesView()
        .tabItem { Label("Mis actividades", systemImage: "calendar") }
      ChildrenView()
        .tabItem { Label("Hijos", systemImage: "person.2") }
      PaymentsView()
        .tabItem { Label("Pagos", systemImage: "creditcard") }
      NewsView()
        .tabItem { Label("Noticias", systemImage: "newspaper") }
      ProfileView()
        .tabItem { Label("Perfil", systemImage: "person.crop.circle") }
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
