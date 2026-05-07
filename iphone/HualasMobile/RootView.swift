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
    .task(id: sessionStore.token) {
      await notificationsStore.sync(token: sessionStore.token)
    }
  }
}

struct MemberShellView: View {
  @StateObject private var cartStore = MemberCartStore()
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore
  @State private var showingNotifications = false

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
    .safeAreaInset(edge: .top) {
      HStack {
        Spacer()
        NotificationsBellButton(unreadCount: notificationsStore.unreadCount) {
          showingNotifications = true
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 8)
      .padding(.bottom, 4)
    }
    .sheet(isPresented: $showingNotifications) {
      NotificationsView()
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
              AddTutorView()
            } label: {
              Label("Agregar tutor", systemImage: "person.badge.plus")
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
    .safeAreaInset(edge: .top) {
      HStack {
        Spacer()
        NotificationsBellButton(unreadCount: notificationsStore.unreadCount) {
          showingNotifications = true
        }
      }
      .padding(.horizontal, 16)
      .padding(.top, 8)
      .padding(.bottom, 4)
    }
    .sheet(isPresented: $showingNotifications) {
      NotificationsView()
    }
  }
}

struct AuthenticatedAvatarView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  let path: String?
  let initials: String
  let diameter: CGFloat
  let reloadKey: String

  @State private var image: UIImage?
  @State private var isLoading = false

  var body: some View {
    ZStack {
      Circle()
        .fill(Color.accentColor.opacity(0.12))

      if let image {
        Image(uiImage: image)
          .resizable()
          .scaledToFill()
      } else if isLoading {
        ProgressView()
          .tint(Color.accentColor)
      } else {
        Text(initials)
          .font(.system(size: diameter * 0.3, weight: .semibold))
          .foregroundStyle(Color.accentColor)
      }
    }
    .frame(width: diameter, height: diameter)
    .clipShape(Circle())
    .overlay(
      Circle()
        .stroke(Color.secondary.opacity(0.1), lineWidth: 1)
    )
    .task(id: taskKey) {
      await loadImage()
    }
  }

  private var taskKey: String {
    [
      path ?? "",
      reloadKey,
      sessionStore.token ?? "",
    ]
    .joined(separator: "|")
  }

  private func loadImage() async {
    guard let path, let token = sessionStore.token else {
      image = nil
      return
    }

    isLoading = true
    defer { isLoading = false }

    do {
      image = try await APIClient.shared.authenticatedImage(path: path, token: token)
    } catch {
      guard !error.isCancellationError else { return }
      image = nil
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
