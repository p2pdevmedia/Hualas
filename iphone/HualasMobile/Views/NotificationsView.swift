import SwiftUI

struct NotificationsView: View {
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          summaryCard

          if notificationsStore.isLoading && notificationsStore.items.isEmpty {
            ProgressView("Cargando notificaciones...")
              .frame(maxWidth: .infinity, alignment: .center)
              .padding(.vertical, 20)
          } else if notificationsStore.items.isEmpty {
            emptyState
          } else {
            LazyVStack(spacing: 12) {
              ForEach(notificationsStore.items) { notification in
                NavigationLink {
                  NotificationDetailView(notification: notification)
                } label: {
                  notificationRow(notification)
                }
                .buttonStyle(.plain)
              }
            }
          }

          if let errorMessage = notificationsStore.errorMessage {
            Text(errorMessage)
              .font(.footnote)
              .foregroundStyle(.red)
          }
        }
        .padding()
      }
      .navigationTitle("Notificaciones")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            Task { await notificationsStore.markAllRead() }
          } label: {
            Text("Marcar todo")
          }
          .disabled(notificationsStore.unreadCount == 0)
        }
      }
      .task {
        await notificationsStore.refresh()
      }
      .refreshable {
        await notificationsStore.refresh()
      }
    }
  }

  private var summaryCard: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 8) {
        Text("Resumen")
          .font(.headline)
        Text("\(notificationsStore.unreadCount) sin leer · \(notificationsStore.chatUnreadCount) de chat")
          .font(.subheadline)
          .foregroundStyle(.secondary)
        if let lastSyncAt = notificationsStore.lastSyncAt {
          Text("Actualizado \(relativeDateFormatter.localizedString(for: lastSyncAt, relativeTo: Date()))")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  private var emptyState: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("No tenés notificaciones")
          .font(.headline)
        Text("Cuando haya novedades del club, van a aparecer acá y también van a poder llegar como push al iPhone.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private func notificationRow(
    _ notification: MobileNotificationsResponse.NotificationItem
  ) -> some View {
    infoCard {
      HStack(alignment: .top, spacing: 12) {
        icon(for: notification.type)
          .frame(width: 40, height: 40)
          .background(iconBackground(for: notification.type), in: RoundedRectangle(cornerRadius: 14))

        VStack(alignment: .leading, spacing: 6) {
          HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
              Text(notification.title)
                .font(.headline)
                .foregroundStyle(.primary)

              Text(notification.body)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(3)
            }

            Spacer()

            if notification.readAt == nil {
              Circle()
                .fill(Color.accentColor)
                .frame(width: 10, height: 10)
                .padding(.top, 4)
            }
          }

          HStack(spacing: 8) {
            Text(typeLabel(for: notification.type))
              .font(.caption.weight(.semibold))
              .foregroundStyle(Color.accentColor)
            Text(formattedDate(notification.createdAt))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func icon(for type: String) -> some View {
    Image(systemName: iconName(for: type))
      .font(.headline)
      .foregroundStyle(Color.accentColor)
  }

  private func iconBackground(for type: String) -> Color {
    switch type {
    case "CHAT_MESSAGE_NEW":
      return Color.cyan.opacity(0.14)
    case "NEWS_CREATED":
      return Color.orange.opacity(0.14)
    case "PICKUP_NOTICE_CREATED", "PICKUP_NOTICE_ACKNOWLEDGED":
      return Color.green.opacity(0.14)
    case "PAYMENT_APPROVED", "PAYMENT_REJECTED", "PAYMENT_MANUAL_CREATED":
      return Color.blue.opacity(0.14)
    default:
      return Color.accentColor.opacity(0.12)
    }
  }

  private func iconName(for type: String) -> String {
    switch type {
    case "CHAT_MESSAGE_NEW":
      return "bubble.left.and.bubble.right.fill"
    case "NEWS_CREATED":
      return "newspaper.fill"
    case "PICKUP_NOTICE_CREATED", "PICKUP_NOTICE_ACKNOWLEDGED":
      return "bell.badge.fill"
    case "PAYMENT_APPROVED":
      return "creditcard.fill"
    case "PAYMENT_REJECTED":
      return "creditcard.trianglebadge.exclamationmark"
    case "ACTIVITY_DAY_NEW", "ACTIVITY_DAY_UPDATED", "ACTIVITY_DAY_CANCELLED", "ACTIVITY_DAY_REACTIVATED":
      return "calendar.badge.clock"
    case "PROFESSOR_INVOICE_CREATED":
      return "doc.text.fill"
    case "ACTIVITY_CAPACITY_FULL":
      return "person.2.slash.fill"
    default:
      return "bell.fill"
    }
  }

  private func typeLabel(for type: String) -> String {
    switch type {
    case "CHAT_MESSAGE_NEW":
      return "Chat"
    case "NEWS_CREATED":
      return "Noticias"
    case "PICKUP_NOTICE_CREATED", "PICKUP_NOTICE_ACKNOWLEDGED":
      return "Avisos"
    case "PAYMENT_APPROVED":
      return "Pago aprobado"
    case "PAYMENT_REJECTED":
      return "Pago rechazado"
    case "PAYMENT_MANUAL_CREATED":
      return "Movimiento"
    case "ACTIVITY_DAY_NEW":
      return "Nuevo día"
    case "ACTIVITY_DAY_UPDATED":
      return "Día actualizado"
    case "ACTIVITY_DAY_CANCELLED":
      return "Día cancelado"
    case "ACTIVITY_DAY_REACTIVATED":
      return "Día reactivado"
    case "ACTIVITY_CAPACITY_FULL":
      return "Cupo completo"
    case "PROFESSOR_INVOICE_CREATED":
      return "Factura"
    default:
      return "Notificación"
    }
  }

  private func formattedDate(_ raw: String) -> String {
    guard let date = isoFormatter.date(from: raw) ?? fallbackFormatter.date(from: raw) else {
      return raw
    }

    return relativeDateFormatter.localizedString(for: date, relativeTo: Date())
  }
}

struct NotificationDetailView: View {
  @Environment(\.openURL) private var openURL
  @EnvironmentObject private var notificationsStore: MobileNotificationsStore

  let notification: MobileNotificationsResponse.NotificationItem

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        infoCard {
          VStack(alignment: .leading, spacing: 10) {
            Text(currentNotification.title)
              .font(.title2.bold())
            Text(currentNotification.body)
              .font(.body)
              .foregroundStyle(.secondary)
          }
        }

        infoCard {
          VStack(alignment: .leading, spacing: 8) {
            Text("Detalle")
              .font(.headline)
            Text("Tipo: \(currentNotification.type)")
            Text("Estado: \(readStateLabel)")
            Text("Recibida: \(formattedDate(currentNotification.createdAt))")
          }
          .font(.footnote)
          .foregroundStyle(.secondary)
        }

        if let url = currentNotification.url, let destination = resolvedURL(from: url) {
          Button {
            openURL(destination)
          } label: {
            Text("Abrir destino")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14))
              .foregroundStyle(.white)
          }
          .buttonStyle(.plain)
        }
      }
      .padding()
    }
    .navigationTitle("Notificación")
    .navigationBarTitleDisplayMode(.inline)
    .task {
      await notificationsStore.markRead(id: notification.id)
    }
  }

  private var currentNotification: MobileNotificationsResponse.NotificationItem {
    notificationsStore.notification(id: notification.id) ?? notification
  }

  private var readStateLabel: String {
    currentNotification.readAt == nil ? "Sin leer" : "Leída"
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func resolvedURL(from raw: String) -> URL? {
    if let url = URL(string: raw), url.scheme != nil {
      return url
    }

    return URL(string: raw, relativeTo: AppConfig.apiBaseURL)?.absoluteURL
  }

  private func formattedDate(_ raw: String) -> String {
    guard let date = isoFormatter.date(from: raw) ?? fallbackFormatter.date(from: raw) else {
      return raw
    }

    return detailFormatter.string(from: date)
  }
}

private let isoFormatter: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  return formatter
}()

private let fallbackFormatter: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter
}()

private let relativeDateFormatter: RelativeDateTimeFormatter = {
  let formatter = RelativeDateTimeFormatter()
  formatter.unitsStyle = .abbreviated
  return formatter
}()

private let detailFormatter: DateFormatter = {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "es_AR")
  formatter.dateStyle = .medium
  formatter.timeStyle = .short
  return formatter
}()
