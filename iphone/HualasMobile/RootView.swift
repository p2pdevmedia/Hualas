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
      MemberDashboardView()
        .tabItem { Label("Home", systemImage: "house") }
      ChildrenView()
        .tabItem { Label("Hijos", systemImage: "person.2") }
      ActivitiesView()
        .tabItem { Label("Actividades", systemImage: "calendar") }
      PaymentsView()
        .tabItem { Label("Pagos", systemImage: "creditcard") }
      NewsView()
        .tabItem { Label("Noticias", systemImage: "newspaper") }
    }
  }
}

struct ProfessorShellView: View {
  var body: some View {
    TabView {
      ProfessorDashboardView()
        .tabItem { Label("Home", systemImage: "house") }
      GroupsView()
        .tabItem { Label("Grupos", systemImage: "rectangle.grid.2x2") }
      StudentsView()
        .tabItem { Label("Alumnos", systemImage: "person.3") }
      AttendanceView()
        .tabItem { Label("Asistencia", systemImage: "checklist") }
      PaymentsView()
        .tabItem { Label("Pagos", systemImage: "creditcard") }
    }
  }
}

