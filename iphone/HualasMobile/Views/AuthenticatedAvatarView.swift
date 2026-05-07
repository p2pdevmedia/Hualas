import SwiftUI
import UIKit

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
