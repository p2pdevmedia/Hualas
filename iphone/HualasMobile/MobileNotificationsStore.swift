import Foundation
import UIKit

@MainActor
final class MobileNotificationsStore: ObservableObject {
  @Published private(set) var items: [MobileNotificationsResponse.NotificationItem] = []
  @Published private(set) var unreadCount = 0
  @Published private(set) var chatUnreadCount = 0
  @Published private(set) var isLoading = false
  @Published private(set) var lastSyncAt: Date?
  @Published private(set) var errorMessage: String?

  private var currentToken: String?
  private var observers: [NSObjectProtocol] = []

  init() {
    let center = NotificationCenter.default

    observers.append(
      center.addObserver(
        forName: UIApplication.didBecomeActiveNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { await self?.refresh() }
      }
    )

    observers.append(
      center.addObserver(
        forName: .hualasRemoteNotificationReceived,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { await self?.refresh() }
      }
    )
  }

  deinit {
    for observer in observers {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  func sync(token: String?) async {
    currentToken = token
    guard token != nil else {
      reset()
      return
    }
    await refresh()
  }

  func refresh() async {
    await refresh(token: currentToken)
  }

  func markRead(id: String) async {
    guard let token = currentToken else { return }

    if let index = items.firstIndex(where: { $0.id == id }) {
      if items[index].readAt == nil {
        items[index].readAt = ISO8601DateFormatter().string(from: Date())
        unreadCount = max(0, unreadCount - 1)
        if items[index].type == "CHAT_MESSAGE_NEW" {
          chatUnreadCount = max(0, chatUnreadCount - 1)
        }
      }
    }

    do {
      try await APIClient.shared.markNotificationRead(token: token, id: id)
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func markAllRead() async {
    guard let token = currentToken else { return }

    let now = ISO8601DateFormatter().string(from: Date())
    for index in items.indices {
      if items[index].readAt == nil {
        items[index].readAt = now
      }
    }
    unreadCount = 0
    chatUnreadCount = 0

    do {
      try await APIClient.shared.markAllNotificationsRead(token: token)
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func notification(id: String) -> MobileNotificationsResponse.NotificationItem? {
    items.first(where: { $0.id == id })
  }

  private func refresh(token: String?) async {
    guard let token else {
      reset()
      return
    }

    guard !isLoading else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      let response = try await APIClient.shared.notifications(token: token)
      guard token == currentToken else {
        return
      }
      items = response.notifications
      unreadCount = response.unreadCount
      chatUnreadCount = response.chatUnreadCount
      lastSyncAt = Date()
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[notifications] load failed", error)
    }
  }

  private func reset() {
    items = []
    unreadCount = 0
    chatUnreadCount = 0
    errorMessage = nil
    lastSyncAt = nil
  }
}
