import SwiftUI
import UIKit

struct RootView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore

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
    .task(id: sessionStore.isAuthenticated ? sessionStore.token : nil) {
      await notificationsStore.sync(
        token: sessionStore.isAuthenticated ? sessionStore.token : nil
      )
    }
  }
}

struct MemberShellView: View {
  @StateObject private var cartStore = MemberCartStore()
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore
  @State private var showingCart = false
  @State private var showingNotifications = false

  var body: some View {
    TabView {
      MemberDashboardView(cartStore: cartStore)
        .tabItem { Label("Inicio", systemImage: "house.fill") }
      ActivitiesView()
        .tabItem { Label("Mis actividades", systemImage: "calendar") }
      ChildrenView()
        .tabItem { Label("Hijos", systemImage: "person.2") }
      MoreTabView()
        .tabItem { Label("Más", systemImage: "ellipsis.circle") }
    }
    .safeAreaInset(edge: .top, spacing: 0) {
      HStack {
        Spacer()

        HStack(spacing: 10) {
          Button {
            showingCart = true
          } label: {
            Image(systemName: "cart.fill")
              .font(.system(size: 17, weight: .semibold))
              .foregroundStyle(cartStore.itemCount == 0 ? Color.primary.opacity(0.45) : Color.white)
              .frame(width: 38, height: 38)
              .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                  .fill(cartStore.itemCount == 0 ? Color.secondary.opacity(0.12) : Color.accentColor)
              )
              .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                  .stroke(Color.white.opacity(0.08), lineWidth: 1)
              )
          }
          .buttonStyle(.plain)
          .disabled(cartStore.itemCount == 0)
          .opacity(cartStore.itemCount == 0 ? 0.55 : 1)
          .accessibilityLabel("Carrito")

          NotificationsBellButton(unreadCount: notificationsStore.unreadCount) {
            showingNotifications = true
          }
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 8)
    }
    .sheet(isPresented: $showingNotifications) {
      NotificationsView()
    }
    .sheet(isPresented: $showingCart) {
      NavigationStack {
        MemberCartView(cartStore: cartStore)
      }
    }
  }
}

struct MoreTabView: View {
  @EnvironmentObject private var sessionStore: SessionStore

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

        if sessionStore.currentRole == .member {
          Section("Familia") {
            NavigationLink {
              TutorsView()
            } label: {
              Label("Tutores", systemImage: "person.2")
            }

            NavigationLink {
              PickupNoticesView()
            } label: {
              Label("Avisos de retiro", systemImage: "bell.badge")
            }
          }
        }
      }
      .navigationTitle("Más")
      .toolbar(.hidden, for: .navigationBar)
    }
  }
}

struct ProfessorShellView: View {
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore
  @State private var showingNotifications = false

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
    .safeAreaInset(edge: .top, spacing: 0) {
      HStack {
        Spacer()
        NotificationsBellButton(unreadCount: notificationsStore.unreadCount) {
          showingNotifications = true
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 8)
    }
    .sheet(isPresented: $showingNotifications) {
      NotificationsView()
    }
  }
}

extension UIImage {
  func hualasJPEGData(
    maxDimension: CGFloat = 1280,
    compressionQuality: CGFloat = 0.85
  ) -> Data? {
    let longestSide = max(size.width, size.height)
    let scale = min(maxDimension / max(longestSide, 1), 1)
    let targetSize = CGSize(
      width: max(size.width * scale, 1),
      height: max(size.height * scale, 1)
    )

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
    let renderedImage = renderer.image { _ in
      draw(in: CGRect(origin: .zero, size: targetSize))
    }

    return renderedImage.jpegData(compressionQuality: compressionQuality)
  }
}
