import SwiftUI
import UIKit

@MainActor
final class AvatarImageCache {
  static let shared = AvatarImageCache()

  private let cache = NSCache<NSString, UIImage>()

  func image(for key: String) -> UIImage? {
    cache.object(forKey: key as NSString)
  }

  func insert(_ image: UIImage, for key: String) {
    cache.setObject(image, forKey: key as NSString)
  }

  func removeAll() {
    cache.removeAllObjects()
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

  private var cacheKey: String {
    [
      path ?? "",
      reloadKey,
    ]
    .joined(separator: "|")
  }

  @MainActor
  private func loadImage() async {
    guard let path, let token = sessionStore.token else {
      image = nil
      return
    }

    if let cachedImage = AvatarImageCache.shared.image(for: cacheKey) {
      image = cachedImage
      return
    }

    isLoading = true
    defer { isLoading = false }

    do {
      guard let downloadedImage = try await APIClient.shared.authenticatedImage(
        path: path,
        token: token
      ) else {
        image = nil
        return
      }

      AvatarImageCache.shared.insert(downloadedImage, for: cacheKey)
      image = downloadedImage
    } catch {
      guard !error.isCancellationError else { return }
      image = nil
    }
  }
}
